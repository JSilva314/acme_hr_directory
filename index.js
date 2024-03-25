const pg = require("pg");
const express = require("express");
const app = express();
const client = new pg.Client(
  process.env.DATABASE_URL || "postgres://localhost/acme_hr_directory_db"
);
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`listening on port ${port}`));

const init = async () => {
  await client.connect();
  let SQL = /*SQL*/ `
    DROP TABLE IF EXISTS employees;
    DROP TABLE IF EXISTS department;

    CREATE TABLE employees(
      id SERIAL PRIMARY KEY,
      name VARCHAR(50)
    );
    CREATE TABLE department(
      id SERIAL PRIMARY KEY,
      name VARCHAR(100),
      created_at TIMESTAMP DEFAULT now(),
      updated_at TIMESTAMP DEFAULT now(),
      department_id INTEGER REFERENCES department(id)
    );
  `;
  await client.query(SQL);
  console.log("tables created");
  SQL = /*SQL*/ `
  INSERT INTO department (name) VALUES('Management');
  INSERT INTO department (name) VALUES('Customer Service');
  INSERT INTO department (name) VALUES ('Employee Relations');
  INSERT INTO employees (name, department_id) VALUES ('Michaelangelo', (SELECT id from department WHERE name = 'Management'));
  INSERT INTO employees (name, department_id) VALUES ('Donatello', (SELECT id from department WHERE name = 'Employee Relations'));
  INSERT INTO employees (name, department_id) VALUES ('Raphael', (SELECT id from department WHERE name = 'Customer Service'));
  INSERT INTO employees (name, department_id) VALUES ('Leonardo', (SELECT id from department WHERE name = 'Management')); 
 

`;

  await client.query(SQL);
  console.log("data seeded");
};

app.use(express.json());
app.use(require("morgan")("dev"));

app.get("/api/employees", async (req, res, next) => {
  try {
    const SQL = /*SQL*/ `SELECT * from employees
    `;
    const response = await client.query(SQL);
    res.send(response.rows);
  } catch (errpr) {
    next(error);
  }
});

app.get("/api/department", async (req, res, next) => {
  try {
    const SQL = /*SQL*/ `
      SELECT * from department ORDER BY created_at DESC;
    `;
    const response = await client.query(SQL);
    res.send(response.rows);
  } catch (error) {
    next(error);
  }
});

app.post("/api/employees", async (req, res, next) => {
  try {
    const SQL = /*SQL*/ `
        INSERT INTO employees (name, department_id)
        VALUES($1, $2)
        RETURNING * 
        `;
    const response = await client.query(SQL, [
      req.body.name,
      req.body.department_id,
    ]);
    res.send(response.rows[0]);
  } catch (error) {
    next(error);
  }
});

app.put("/api/employees/:id", async (req, res, next) => {
  try {
    const { name, department_id } = req.body;
    const employeesId = req.params.id;

    const SQL = /*SQL*/ `
      UPDATE employees
      SET name=$1, department_id=$2, updated_at=now()
      WHERE id=$3
      RETURNING *
      `;

    const response = await client.query(SQL, [
      name,
      department_id,
      employeesId,
    ]);
    if (response.rows.length === 0) {
      return res.status(404).send("Employee not found");
    }
    res.send(response.rows[0]);
  } catch (error) {
    next(error);
  }
});

app.delete("/api/employees/:id", async (req, res, next) => {
  try {
    const SQL = /* SQL*/ `
        DELETE from employees WHERE id=$1
        `;
    const response = await client.query(SQL, [req.params.id]);
    res.sendStatus(204);
  } catch (error) {
    next(error);
  }
});

init();
