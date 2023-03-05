# todo-service

## Introduction
As a Backend Developer, using Java SpringBoot, this is my first simple backend service written in Node.js.

## Step to start the micro service:
1. make sure the port 5431 and 8080 is free to avaliable 
2. run the following command
```
docker-compose up -d
npm install
npm run app:compile
npm run app:run
```
3. add header user-id(number) to simulate authentication

## Exercise
You are helping a small company to write a service to help keep track of some To Do list
items. Using NodeJS and related frameworks, create the necessary APIs to create new To Do
list item AND reading To Do list items belong to a specific user.

For this exercise, you can omit:
1. Authentication and Authorization
2. Security and Exception monitoring

The goal is for us to gain an understanding on your logic, approach to solve a problem and
the level of your skillset in NodeJS.