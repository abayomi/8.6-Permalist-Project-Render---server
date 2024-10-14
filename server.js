import express from "express";
import pg from "pg";
import env from "dotenv";

const app = express();
const port = 4000;

console.log("Info log: setting up program to read env file.");
env.config();
console.log("Info log: new pg client creating.");

/* ssl: true needs to be there to prevent the error below which showed up on the console:
"connection error Error: read ECONNRESET at TCP.onStreamRead (node:internal/stream_base_commons:218:20) "*/
const db = new pg.Client({
  user: process.env.USER,
  host: process.env.HOST,
  database: process.env.DATABASE,
  password: process.env.PASSWORD,
  port: process.env.PORT,
  ssl: true,
});
console.log("Info log: db.on.");
db.on("error", (err) => {
  console.error(
    "error log: something has gone wrong with db connection!",
    err.stack
  );
});
console.log("Info log: db connection attempt.");
await db
  .connect()
  .then(() => {
    console.log(
      "Info log: db connected, now action dependent on DB can be performed"
    );
    performActionsOnceDBConntcted();
  })
  .catch((err) => {
    console.error("Error log: DB connection error", err);
  });

//username is postgrespermalist in render
console.log("Info log: middleware starting");
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(express.json());
console.log("Info log: midleware ending");

let items = [
  { id: 1, title: "Buy milk" },
  { id: 2, title: "Finish homework" },
];

function performActionsOnceDBConntcted() {}

async function getItems() {
  //console.log("in getItems");
  let response = await db.query("select * from items");
  //console.log("end getItems");
  return response.rows;
}

// app.get("/", async (req, res) => {
//   //console.log("in /");
//   items = await getItems();
//   res.render("index.ejs", {
//     listTitle: "Today",
//     listItems: items,
//   });
// });

app.get("/items", async (req, res) => {
  console.log("Info log: starting fetching items in server");
  items = await getItems();
  res.send({ listTitle: "ARC To Do List", listItems: items });
  console.log("Info log: ending fetching items in server");
});

// app.post("/add", async (req, res) => {
//   const item = req.body.newItem;
//   //items.push({ title: item });
//   let response = await db.query("insert into items (title) values($1)", [item]);
//   res.redirect("/");
// });
app.post("/addItem", async (req, res) => {
  console.log("Info log: starting adding an item in server");
  console.log("req.body:" + JSON.stringify(req.body));
  const item = req.body.newItem;
  if (item != undefined) {
    try {
      let response = await db.query("insert into items (title) values($1)", [
        item,
      ]);
      res.send({ message: "Success" });
      console.log("Info log: ending adding an item in server");
    } catch (error) {
      console.log(
        "Error log: There was an error while adding item. Rolling back..."
      );
      await db.query("ROLLBACK;");
      res.send({ error: "Your last operation encountered an error." });
    }
  } else {
    res.send({ error: "Your last operation encountered an error." });
    console.log(
      "Error log: there was no item sent to the server but the add method was called."
    );
  }
});

// app.post("/edit", async (req, res) => {
//   let updatedItemTitle = req.body.updatedItemTitle;
//   let updatedItemId = req.body.updatedItemId;
//   console.log(req.body);
//   let response = db.query("update items set title=$1 where id=$2", [
//     updatedItemTitle,
//     updatedItemId,
//   ]);
//   res.redirect("/");
// });

app.post("/editItem", async (req, res) => {
  console.log("Info log: starting editing an item in server");
  let updatedItemTitle = req.body.updatedItemTitle;
  let updatedItemId = req.body.updatedItemId;
  console.log(req.body);
  if (updatedItemId != undefined && updatedItemTitle != undefined) {
    try {
      let response = db.query("update items set title=$1 where id=$2", [
        updatedItemTitle,
        updatedItemId,
      ]);
      res.send({ message: "Success" });
      console.log("Info log: ending editing an item in server");
    } catch (error) {
      console.log(
        "Error log: There was an error while editing item. Rolling back..."
      );
      await db.query("ROLLBACK;");
      res.send({ error: "Your last operation encountered an error." });
    }
  } else {
    res.send({ error: "Your last operation encountered an error." });
    console.log(
      "Error log: either the item's ID or body were missing, but the edit method was called."
    );
  }
});

// app.post("/delete", async (req, res) => {
//   let deleteItemId = req.body.deleteItemId;
//   let respinse = db.query("delete from items where id=$1", [deleteItemId]);
//   res.redirect("/");
// });

app.post("/deleteItem", async (req, res) => {
  console.log("Info log: starting deleteing an item in server");
  let deleteItemId = req.body.deleteItemId;
  if (deleteItemId != undefined) {
    try {
      let response = db.query("delete from items where id=$1", [deleteItemId]);
      res.send({ message: "Success" });
      console.log("Info log: ending deleteing an item in server");
    } catch (error) {
      console.log(
        "Error log: There was an error while deteling item. Rolling back..."
      );
      await db.query("ROLLBACK;");
      res.send({ error: "Your last operation encountered an error." });
    }
  } else {
    res.send({ error: "Your last operation encountered an error." });
    console.log(
      "Error log: there was no id sent to the server but the delete method was called."
    );
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
