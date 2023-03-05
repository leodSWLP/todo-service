DO $$
BEGIN

CREATE TYPE "task_status" AS ENUM (
    'IN_PROGRESS',
    'COMPLETED'
);


CREATE TABLE "todo_task" (
	id BIGSERIAL,
	
    title TEXT NOT NULL,
    description TEXT,
    
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    status task_status NOT NULL,
    user_id BIGINT NOT NULL,
    created_on TIMESTAMPTZ NOT NULL,

	PRIMARY KEY(id)
);


EXCEPTION
WHEN OTHERS THEN

ROLLBACK;

RAISE;
END;

$$;