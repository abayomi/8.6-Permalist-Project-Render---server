import winston from "winston";
import env from "dotenv";
import { Logtail } from "@logtail/node"; //to save logs to betterstack
import { LogtailTransport } from "@logtail/winston"; //to save logs to betterstack

env.config();
/*Creating the default winston logger format is json. format: winston.format.cli() gives color coding */
const betterstackToDoListServiceToken =
  process.env.BETTERSTACK_TODOLISTSERVICE_TOKEN; //betterstack token
const logtail = new Logtail(betterstackToDoListServiceToken); //logtail is used to log to betterstack website

const { combine, timestamp, printf, json, errors } = winston.format;

// Determine the log level based on the NODE_ENV environment variable
console.log(process.env.NODE_ENV);
const logLevel = process.env.NODE_ENV === "production" ? "silent" : "info";

const winstonLogger = winston.loggers.add("toDoItemsWinstonLogger", {
  level: logLevel,
  format: combine(
    errors({ stack: true }),
    timestamp(),
    winston.format.colorize(),
    printf((info) => `${info.timestamp} ${info.level}: ${info.message}`)
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "serverToDo.log" }),
    new LogtailTransport(logtail),
  ],
});

export { winstonLogger };
