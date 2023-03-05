export type ErrorObject = {
    status: number;
    message: string;
}


export enum TaskStatus {
    IN_PROGRESS = 'IN_PROGRESS',
    COMPLETED = 'COMPLETED',
};

export type CreateTaskRequest = {
    title: string;
    description?: string;
    start_date?: Date;
    end_date: Date;
};

export type UpdateTaskRequest = CreateTaskRequest & {
    status: TaskStatus;
}

export type TaskEntity = {
    id?: number;
    title: string;
    description?: string;
    start_date: Date;
    end_date: Date;
    status: TaskStatus;
    userId: number;
    created_on?: Date;
}