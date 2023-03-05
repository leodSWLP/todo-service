import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import {
  TaskStatus,
  CreateTaskRequest,
  UpdateTaskRequest,
  TaskEntity,
  ErrorObject
} from './app.type';

dotenv.config();
const ENV = process.env;

const pool = new Pool({
  user: ENV.DATABASE_USER,
  host: ENV.DATABASE_HOST,
  database: ENV.DATABASE_NAME,
  password: ENV.DATABASE_PASSWORD,
  port: ENV.DATABASE_PORT
});

const app = express();
app.use(express.json());
console.log(`Connecting to: ${JSON.stringify(pool)}`);

const parseErrorObject = (status: number, message: string): ErrorObject => {
  return {
    status: status,
    message: message
  };
};

const handleError = (err: any): ErrorObject | null => {
  if (typeof err === 'object' && err && err.status && err.message) {
    return err;
  }
  return null;
};

const getUserId = (req: Request): number => {
  /* requirement: omit authentication and authorization
    My assumption: there is a microservice that authenticate and pass the current user's id as header */
  const userId: string = req.header('user-id');
  if (!userId) {
    console.log('missing request header user-id');
    throw parseErrorObject(401, 'UNAUTHORIZED');
  }

  console.log(`current userId: ${userId}`);
  return parseInt(userId);
};

const validRequest = (requestBody: CreateTaskRequest) => {
  if (
    typeof requestBody.end_date !== 'string' ||
    isNaN(Date.parse(requestBody.end_date))
  ) {
    throw parseErrorObject(400, 'Invalid date format for end_date');
  }

  if (
    requestBody.start_date &&
    (typeof requestBody.start_date !== 'string' ||
      isNaN(Date.parse(requestBody.start_date)))
  ) {
    throw parseErrorObject(400, 'Invalid date format for start_date');
  }

  if (!requestBody.end_date || !requestBody.title) {
    throw parseErrorObject(400, 'end_date && title must not be null');
  }

  if (new Date(requestBody.end_date) < new Date()) {
    throw parseErrorObject(400, 'now > end_date is not allowed');
  }

  if (
    requestBody.start_date &&
    new Date(requestBody.start_date) > new Date(requestBody.end_date)
  ) {
    throw parseErrorObject(400, 'start_date > end_date is not allowed');
  }

};

const updateRows = (rows: TaskEntity[]) => {
  return rows.map((row) => {
    if (row.status === 'COMPLETED') {
      return {
        ...row
      };
    }

    if (new Date(row.end_date) < new Date()) {
      return {
        ...row,
        status: 'EXPIRED'
      };
    }
    if (new Date(row.start_date) < new Date()) {
      return {
        ...row,
        status: 'PENDING'
      };
    }
    return {
      ...row
    };
  });
};

app.get('/api/v1/todo', async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM todo_task 
      where user_id = ${getUserId(req)} 
      order by status asc, end_date asc`
    );

    res.json(updateRows(rows));
  } catch (err) {
    console.log(`Original error: ${JSON.stringify(err)}`);

    const errorObj: ErrorObject | null = handleError(err);
    const errorResponse: ErrorObject = {
      status: errorObj?.status ?? 500,
      message: errorObj?.message ?? 'Internal Server Error'
    };
    console.log(
      `method: ${req.method}, path: ${req.path}, error status: ${errorResponse.status}, message = ${errorResponse.message}`
    );
    res.status(errorResponse.status).json({ error: errorResponse.message });
  }
});

app.get('/api/v1/todo/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);

    const { rows } = await pool.query(
      `SELECT * FROM todo_task 
        where user_id = ${getUserId(req)}
        and id = ${id}`
    );
    const updatedRow = updateRows(rows)[0];
    if (!updatedRow || Object.getOwnPropertyNames(updatedRow).length == 0) {
        throw parseErrorObject(404, "Record not found")
    }
    res.json(updatedRow);

  } catch (err) {
    console.log(`Original error: ${JSON.stringify(err)}`);

    const errorObj: ErrorObject | null = handleError(err);
    const errorResponse: ErrorObject = {
      status: errorObj?.status ?? 404,
      message: errorObj?.message ?? 'Not found'
    };
    console.log(
      `method: ${req.method}, path: ${req.path}, error status: ${errorResponse.status}, message = ${errorResponse.message}`
    );
    res.status(errorResponse.status).json({ error: errorResponse.message });
  }
});

app.put('/api/v1/todo/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);

    const requestBody = req.body as UpdateTaskRequest;
    validRequest(requestBody);

    if (!requestBody.status) {
      throw parseErrorObject(400, 'status must not be null');
    }

    const taskEntity: TaskEntity = {
      ...requestBody,
      start_date: requestBody.start_date || new Date(),
      userId: getUserId(req)
    };

    const query = {
      text: 'UPDATE todo_task SET title = $1, description = $2, start_date = $3, end_date = $4, status = $5 WHERE user_id = $6 and id = $7 RETURNING *',
      values: [
        taskEntity.title,
        taskEntity.description,
        taskEntity.start_date,
        taskEntity.end_date,
        taskEntity.status,
        taskEntity.userId,
        taskEntity.id
      ]
    };
    console.log(`Insert SQL: ${JSON.stringify(query)}`);

    const { rows } = await pool.query(query);
    const updatedRow = updateRows(rows)[0];
    if (!updatedRow || Object.getOwnPropertyNames(updatedRow).length == 0) {
        throw parseErrorObject(404, "Record not found")
    }

    res.json(updatedRow);
  } catch (err) {
    console.log(`Original error: ${JSON.stringify(err)}`);

    const errorObj: ErrorObject | null = handleError(err);
    const errorResponse: ErrorObject = {
      status: errorObj?.status ?? 400,
      message: errorObj?.message ?? 'Bad Request'
    };
    console.log(
      `method: ${req.method}, path: ${req.path}, error status: ${errorResponse.status}, message = ${errorResponse.message}`
    );
    res.status(errorResponse.status).json({ error: errorResponse.message });
  }
});

app.post('/api/v1/todo', async (req: Request, res: Response) => {
  try {
    const requestBody = req.body as CreateTaskRequest;
    validRequest(requestBody);

    const taskEntity: TaskEntity = {
      ...requestBody,
      start_date: requestBody.start_date || new Date(),
      status: TaskStatus.IN_PROGRESS,
      userId: getUserId(req),
      created_on: new Date()
    };

    const query = {
      text: 'INSERT INTO todo_task (title, description, start_date, end_date, status, user_id, created_on) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      values: [
        taskEntity.title,
        taskEntity.description,
        taskEntity.start_date,
        taskEntity.end_date,
        taskEntity.status,
        taskEntity.userId,
        taskEntity.created_on
      ]
    };
    console.log(`Insert SQL: ${JSON.stringify(query)}`);

    const { rows } = await pool.query(query);
    res.json(rows[0]);
  } catch (err) {
    console.log(`Original error: ${JSON.stringify(err)}`);

    const errorObj: ErrorObject | null = handleError(err);
    const errorResponse: ErrorObject = {
      status: errorObj?.status ?? 400,
      message: errorObj?.message ?? 'Bad Request'
    };
    console.log(
      `method: ${req.method}, path: ${req.path}, error status: ${errorResponse.status}, message = ${errorResponse.message}`
    );
    res.status(errorResponse.status).json({ error: errorResponse.message });
  }
});

app.delete('/api/v1/todo/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { rows } = await pool.query(
      'DELETE FROM todo_task WHERE id = $1 and user_id = $2 RETURNING *',
      [id, getUserId(req)]
    );
    const task: TaskEntity = rows[0];

    if (task) {
      res.json({ message: 'Task Deleted' });
    } else {
      throw parseErrorObject(404,'Task Not Found');
    }

  } catch (err) {
    console.log(`Original error: ${JSON.stringify(err)}`);
    const errorObj: ErrorObject | null = handleError(err);
    const errorResponse: ErrorObject = {
      status: errorObj?.status ?? 400,
      message: errorObj?.message ?? 'Bad Request'
    };
    console.log(
      `method: ${req.method}, path: ${req.path}, error status: ${errorResponse.status}, message = ${errorResponse.message}`
    );
    res.status(errorResponse.status).json({ error: errorResponse.message });
  }
});

app.listen(ENV.SERVER_PORT, () => {
  console.log(`Server listening on port ${ENV.SERVER_PORT}`);
});
