const express = require("express");
const app = express();
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const format = require("date-fns/format");
app.use(express.json());

const dbPath = path.join(__dirname, "todoApplication.db");
let db = null;
const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("server running");
    });
  } catch (error) {
    console.log(`DB Error:${error}`);
  }
};
initializeDbAndServer();

const hasStatus = (queryParams) => {
  return queryParams.status !== undefined;
};

const hasPriority = (queryParams) => {
  return queryParams.priority !== undefined;
};

const hasPriorityAndStatus = (queryParams) => {
  return queryParams.priority !== undefined && queryParams.status !== undefined;
};

const hasSearchQuery = (queryParams) => {
  return queryParams.search_q !== undefined;
};

const hasCategory = (queryParams) => {
  return queryParams.category !== undefined;
};

const hasCategoryAndStatus = (queryParams) => {
  return queryParams.category !== undefined && queryParams.status !== undefined;
};

const hasCategoryAndPriority = (queryParams) => {
  return;
  queryParams.category !== undefined && queryParams.priority !== undefined;
};

const priorities = ["HIGH", "MEDIUM", "LOW"];
const statuses = ["TO DO", "IN PROGRESS", "DONE"];
const cat = ["WORK", "HOME", "LEARNING"];

app.get("/todos/", async (request, response) => {
  let todosQuery;
  let valid = true;
  let msg = "Item";
  switch (true) {
    case hasStatus(request.query):
      valid = statuses.includes(request.query.status);
      msg = "Status";
      todosQuery = `select * from todo where status = "${request.query.status}";`;
      break;

    case hasPriority(request.query):
      valid = priorities.includes(request.query.priority);
      msg = "Priority";
      todosQuery = `select * from todo where priority = "${request.query.priority}";`;
      break;

    case hasCategory(request.query):
      valid = cat.includes(request.query.category);
      msg = "Category";
      todosQuery = `select * from todo where category = "${request.query.category}";`;
      break;
    case hasSearchQuery(request.query):
      todosQuery = `select * from todo where todo LIKE "%${request.query.search_q}%";`;
      break;
    case hasPriorityAndStatus(request.query):
      todosQuery = `select * from todo where status = "${request.query.status}" AND priority="${request.query.priority}";`;
      break;
    case hasCategoryAndPriority(request.query):
      todosQuery = `select * from todo where category = "${request.query.category}" AND priority="${request.query.priority}";`;
      break;
    case hasCategoryAndStatus(request.query):
      todosQuery = `select * from todo where category="${request.query.category}"  AND status = "${request.query.status}";`;
      break;
    default:
      break;
  }

  if (valid) {
    const dbResponse = await db.all(todosQuery);
    const updateData = dbResponse.map((each) => ({
      id: each.id,
      todo: each.todo,
      priority: each.priority,
      status: each.status,
      category: each.category,
      dueDate: each.due_date,
    }));
    response.send(updateData);
  } else {
    response.status(400);
    response.send(`Invalid Todo ${msg}`);
  }
});

app.get("/todos/:todoId", async (request, response) => {
  const { todoId } = request.params;
  const getTodoQuery = `select * from todo where id=${todoId};`;
  const each = await db.get(getTodoQuery);
  const updateData = {
    id: each.id,
    todo: each.todo,
    priority: each.priority,
    status: each.status,
    category: each.category,
    dueDate: each.due_date,
  };

  response.send(updateData);
});

app.get("/agenda/", async (request, response) => {
  const { date } = request.query;
  const compareDate = format(new Date(date), "yyyy-MM-dd");
  const dateQuery = `select * from todo where due_date="${date}";`;
  const dbResponse = await db.all(dateQuery);
  const updateData = dbResponse.map((each) => ({
    id: each.id,
    todo: each.todo,
    priority: each.priority,
    status: each.status,
    category: each.category,
    dueDate: each.due_date,
  }));
  if (date === compareDate) {
    response.send(updateData);
  } else {
    response.status(400);
    response.send("Invalid Due Date");
  }
});

app.post("/todos/", async (request, response) => {
  const todoDetails = request.body;
  const { id, todo, priority, status, category, dueDate } = todoDetails;
  const compareDate = format(new Date(dueDate), "yyyy-MM-dd");
  const postQuery = `INSERT INTO todo(id,todo,priority,status,category,due_date) VALUES ( ${id},"${todo}","${priority}","${status}","${category}","${dueDate}");`;
  let valid = true;
  let msg;
  console.log(dueDate === compareDate);
  switch (true) {
    case !priorities.includes(priority):
      valid = false;
      msg = "Todo Priority";
      break;
    case !statuses.includes(status):
      valid = false;
      msg = "Todo Status";
      break;
    case !cat.includes(category):
      valid = false;
      msg = "Todo Category";
      break;
    case dueDate === compareDate:
      valid = false;
      msg = "Due Date";
      break;
  }

  if (valid) {
    const dbResponse = await db.run(postQuery);
    response.send("Todo Successfully Added");
  } else {
    response.status(400);
    response.send(`Invalid ${msg}`);
  }
});

app.put("/todos/:todoId", async (request, response) => {
  const { todoId } = request.params;
  const todoQuery = `select * from todo where id=${todoId};`;
  const todoItem = await db.get(todoQuery);
  const {
    todo = todoItem.todo,
    priority = todoItem.priority,
    status = todoItem.status,
    category = todoItem.category,
    dueDate = todoItem.due_Date,
  } = request.body;
  let updatedColumnName;
  let msg;
  let valid = true;
  switch (true) {
    case request.body.todo !== undefined:
      updatedColumnName = "Todo";
      break;
    case request.body.status !== undefined:
      updatedColumnName = "Status";
      msg = "Todo Status";
      valid = statuses.includes(request.body.status);
      break;
    case request.body.priority !== undefined:
      msg = "Todo Priority";
      updatedColumnName = "Priority";
      valid = priorities.includes(request.body.priority);
      break;
    case request.body.category !== undefined:
      updatedColumnName = "Category";
      msg = "Todo Category";
      valid = cat.includes(request.body.category);
      break;

    case request.body.dueDate !== undefined:
      const compareDate = format(new Date(dueDate), "yyyy-MM-dd");
      valid = dueDate === compareDate;
      updatedColumnName = "Due Date";
      msg = "Due Date";
      break;
  }
  const updateQuery = `UPDATE todo SET todo="${todo}",priority="${priority}",status="${status}",category="${category}",due_date="${dueDate}" where id=${todoId};`;
  if (valid) {
    const responseDb = await db.run(updateQuery);
    response.send(`${updatedColumnName} Updated`);
  } else {
    response.status(400);
    response.send(`Invalid ${msg}`);
  }
});

app.delete("/todos/:todoId", async (request, response) => {
  const { todoId } = request.params;
  const deleteQuery = `DELETE FROM todo WHERE id=${todoId};`;
  const dbResponse = db.run(deleteQuery);
  response.send("Todo Deleted");
});

module.exports = app;
