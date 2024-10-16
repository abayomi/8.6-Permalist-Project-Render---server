import express from "express";
import pg from "pg";
import env from "dotenv";
import { fileURLToPath } from "url";
import path, { dirname } from "path";
import Debug from "debug";

const debugInfo = Debug("todoserver-info-logs");
const debugError = Debug("todoserver-error-logs");
const app = express();
const port = 4000;
const _dirname = dirname(fileURLToPath(import.meta.url));
debugInfo("_dirname:" + _dirname);

debugInfo("Info log: setting up program to read env file.");
env.config();
debugInfo("Info log: new pg client creating.");

/* ssl: true needs to be there to prevent the error below which showed up on the console:
"connection error Error: read ECONNRESET at TCP.onStreamRead (node:internal/stream_base_commons:218:20) "*/
const db = new pg.Client({
  user: process.env.USER,
  host: process.env.HOST,
  database: process.env.DATABASE,
  password: process.env.PASSWORD,
  port: process.env.DB_PORT,
  ssl: true,
});
debugInfo("Info log: db.on.");
db.on("error", (err) => {
  debugError(
    "error log: something has gone wrong with db connection!",
    err.stack
  );
});
debugInfo("Info log: db connection attempt.");
await db
  .connect()
  .then(() => {
    debugInfo(
      "Info log: db connected, now action dependent on DB can be performed"
    );
    performActionsOnceDBConntcted();
  })
  .catch((err) => {
    debugError("Error log: DB connection error", err);
  });

//username is postgrespermalist in render
debugInfo("Info log: middleware starting");
app.use(express.urlencoded({ extended: true }));
//app.use(express.static("public"));
app.use(express.json());
debugInfo("Info log: midleware ending");

let items = [];

function performActionsOnceDBConntcted() {}

async function getItems() {
  //debugInfo("in getItems");
  let response = await db.query("select * from items");
  //debugInfo("end getItems");
  return response.rows;
}

// app.get("/", async (req, res) => {
//   //debugInfo("in /");
//   items = await getItems();
//   res.render("index.ejs", {
//     listTitle: "Today",
//     listItems: items,
//   });
// });

app.get("/", (req, res) => {
  debugInfo("Info log: starting fetching / in server");
  res.send("<h1>server</h1>");
  debugInfo("Info log: ending fetching / in server");
});

app.get("/items", async (req, res) => {
  debugInfo("Info log: starting fetching items in server");
  items = await getItems();
  res.send({ listTitle: "ARC To Do List", listItems: items });
  debugInfo("Info log: ending fetching items in server");
});

// app.post("/add", async (req, res) => {
//   const item = req.body.newItem;
//   //items.push({ title: item });
//   let response = await db.query("insert into items (title) values($1)", [item]);
//   res.redirect("/");
// });
app.post("/addItem", async (req, res) => {
  debugInfo("Info log: starting adding an item in server");
  debugInfo("req.body:" + JSON.stringify(req.body));
  const item = req.body.newItem;
  if (item != undefined) {
    try {
      let response = await db.query("insert into items (title) values($1)", [
        item,
      ]);
      res.send({ message: "Success" });
      debugInfo("Info log: ending adding an item in server");
    } catch (error) {
      debugError(
        "Error log: There was an error while adding item. Rolling back..."
      );
      await db.query("ROLLBACK;");
      res.send({ error: "Your last operation encountered an error." });
    }
  } else {
    res.send({ error: "Your last operation encountered an error." });
    debugError(
      "Error log: there was no item sent to the server but the add method was called."
    );
  }
});

// app.post("/edit", async (req, res) => {
//   let updatedItemTitle = req.body.updatedItemTitle;
//   let updatedItemId = req.body.updatedItemId;
//   debugInfo(req.body);
//   let response = db.query("update items set title=$1 where id=$2", [
//     updatedItemTitle,
//     updatedItemId,
//   ]);
//   res.redirect("/");
// });

app.patch("/editItem", async (req, res) => {
  debugInfo("Info log: starting editing an item in server");
  let updatedItemTitle = req.body.updatedItemTitle;
  let updatedItemId = req.body.updatedItemId;
  debugInfo(req.body);
  if (updatedItemId != undefined && updatedItemTitle != undefined) {
    try {
      let response = db.query("update items set title=$1 where id=$2", [
        updatedItemTitle,
        updatedItemId,
      ]);
      res.send({ message: "Success" });
      debugInfo("Info log: ending editing an item in server");
    } catch (error) {
      debugError(
        "Error log: There was an error while editing item. Rolling back..."
      );
      await db.query("ROLLBACK;");
      res.send({ error: "Your last operation encountered an error." });
    }
  } else {
    res.send({ error: "Your last operation encountered an error." });
    debugError(
      "Error log: either the item's ID or body were missing, but the edit method was called."
    );
  }
});

// app.post("/delete", async (req, res) => {
//   let deleteItemId = req.body.deleteItemId;
//   let respinse = db.query("delete from items where id=$1", [deleteItemId]);
//   res.redirect("/");
// });

app.delete("/deleteItem", async (req, res) => {
  debugInfo("Info log: starting deleteing an item in server");
  debugInfo("Info log: req.body.data.deleteItemId:" + req.body.deleteItemId);
  let deleteItemId = parseInt(req.body.deleteItemId);
  if (deleteItemId != undefined) {
    try {
      let response = db.query("delete from items where id=$1", [deleteItemId]);
      res.send({ message: "Success" });
      debugInfo("Info log: ending deleteing an item in server");
    } catch (error) {
      debugError(
        "Error log: There was an error while deteling item. Rolling back..."
      );
      await db.query("ROLLBACK;");
      res.send({ error: "Your last operation encountered an error." });
    }
  } else {
    res.send({ error: "Your last operation encountered an error." });
    debugError(
      "Error log: there was no id sent to the server but the delete method was called."
    );
  }
});

app.listen(port, () => {
  debugInfo(`Server running on port ${port}`);
});
