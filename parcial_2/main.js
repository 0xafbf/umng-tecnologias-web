// Andrés Botero 2021

import { serve, ServerRequest } from 'https://deno.land/std/http/server.ts';
import { DB } from "https://deno.land/x/sqlite/mod.ts";
import * as dejs from "https://deno.land/x/dejs@0.9.3/mod.ts";
import { Application, Router, REDIRECT_BACK } from "https://deno.land/x/oak/mod.ts";

// Crear la base de datos
const db = new DB('database.sqlite');
db.query('\
CREATE TABLE IF NOT EXISTS "programas" (   \
	"id"	INTEGER,          \
	"nombre"	TEXT,         \
	"sede"	TEXT,             \
	PRIMARY KEY("id")         \
)');

db.query('\
CREATE TABLE IF NOT EXISTS "estudiante" (                                     \
	"id"	INTEGER,                                            \
	"nombre"	TEXT,                                           \
	"correo"	TEXT,                                           \
	"promedio"	NUMERIC,                                        \
	"id_programa"	INTEGER,                                    \
	PRIMARY KEY("id"),                                          \
	FOREIGN KEY("id_programa") REFERENCES "programas"("id")     \
)');

// Datos iniciales
let insert_default_programa = 'INSERT OR IGNORE INTO "programas" ("id", "nombre", "sede") VALUES (?, ?, ?)';
db.query(insert_default_programa, ['111', 'Multimedia',  'Calle 100']);
db.query(insert_default_programa, ['222', 'Mecatrónica', 'Calle 100']);
db.query(insert_default_programa, ['333', 'Civil',       'Cajicá']);
db.query(insert_default_programa, ['444', 'Industrial',  'Cajicá']);

let insert_student = `\
INSERT OR IGNORE INTO estudiante (id, nombre, correo, promedio, id_programa) \
VALUES (?, ?, ?, ?, ?)`;

db.query(insert_student, ['1234', 'Andrés Botero',   'andres@gmail.com', '34', '111']);
db.query(insert_student, ['5678', 'Jose Cifuentes',  'jose@gmail.com', '37', '111']);
db.query(insert_student, ['9012', 'Mario Martinez',  'mario@gmail.com', '45', '222']);
db.query(insert_student, ['3456', 'Dario Durán',     'dario@gmail.com', '43', '222']);
db.query(insert_student, ['7890', 'Santiago Santos', 'santiago@gmail.com', '41', '333']);
db.query(insert_student, ['1357', 'Pepito Perez',    'pepito@gmail.com', '38', '333']);
db.query(insert_student, ['9135', 'Juanito Jordan',  'juanito@gmail.com', '36', '444']);
db.query(insert_student, ['7913', 'Roberto Romero',  'roberto@gmail.com', '34', '444']);


const app = new Application();
const router = new Router();

router.get("/", (ctx) => {
	ctx.response.redirect("/estudiantes");
});

router.get("/estudiantes", async (ctx) => {

	var params = ctx.request.url.searchParams;
	var programa = params.get('programa');
	var order = params.get('order');

	let estudiantes_params = [];
	let estudiantes_query = '\
SELECT \
	estudiante.id, \
	estudiante.nombre, \
	estudiante.correo, \
	estudiante.promedio, \
	programas.nombre as programa \
FROM estudiante \
INNER JOIN programas ON programas.id = estudiante.id_programa \
';
	
	if (programa !== null) {
		estudiantes_query += ' WHERE (estudiante.id_programa)=(?)';
		estudiantes_params.push(programa);
	}
	if (order !== null) {
		estudiantes_query += ` ORDER BY (${order})`;
	}

	let estudiantes = [];
	let suma_promedios = 0;
	let num_estudiantes = 0;
	for (const estudiante of db.query(estudiantes_query, estudiantes_params).asObjects()) {
		estudiantes.push(estudiante);
		num_estudiantes += 1;
		suma_promedios += estudiante.promedio;
	}
	let promedio = suma_promedios / num_estudiantes;

	let data = {
		estudiantes,
		promedio,
		programa,
	};

	ctx.response.body = await dejs.renderFileToString("templates/student-list.ejs", data);
});

router.get("/crear_estudiante", async (ctx) => {
	let programas = db.query('SELECT id, nombre, sede FROM programas').asObjects();
	let estudiante = {id: "", nombre: "", programa: "", promedio: "", correo: ""};
	let data = {estudiante, programas};
	let output = await dejs.renderFileToString("templates/student-create.ejs", data);
	
	ctx.response.body = output;
});

router.post("/crear_estudiante", async (ctx) => {
	var body = await ctx.request.body();
	var formData = await body.value;
	var data2 = [
		formData.get("id"),
		formData.get("name"),
		formData.get("correo"),
		formData.get("promedio"),
		formData.get("programa")
	];
	db.query('INSERT INTO estudiante(id, nombre, correo, promedio, id_programa) VALUES (?, ?, ?, ?, ?)', data2);
	
	ctx.response.redirect("/estudiantes");
});

router.get("/estudiante/:id", async(ctx) => {

	let id_estudiante = ctx.params.id;
	let estudiante = [...db.query('SELECT id, nombre, correo, promedio, id_programa FROM estudiante WHERE id=?', [id_estudiante]).asObjects()][0];
	let programas = db.query('SELECT id, nombre FROM "programas"').asObjects();

	let data = {estudiante, programas};

	let output = await dejs.renderFileToString("templates/student-create.ejs", data);
	
	ctx.response.body = output;
});

router.post("/estudiante/:id", async(ctx) => {
	let id_estudiante = ctx.params.id;
	var body = await ctx.request.body();
	var formData = await body.value;
	var data2 = [
//		id_estudiante,
		formData.get("id"),
		formData.get("name"),
		formData.get("correo"),
		formData.get("promedio"),
		formData.get("programa"),
		id_estudiante,
	];
	db.query('\
UPDATE estudiante \
SET id=?, nombre=?, correo=?, promedio=?, id_programa=? \
WHERE id=? \
', data2);
	
	ctx.response.redirect("/estudiantes");

});


router.get("/programas", async (ctx) => {
	let programas = db.query('SELECT * FROM "programas"').asObjects();

	let data = {programas};

	ctx.response.body = await dejs.renderFileToString("templates/programa-list.ejs", data);
});

router.get("/consultas", async (ctx) => {
	let programas = db.query('SELECT * FROM "programas"').asObjects();

	let data = {programas};

	ctx.response.body = await dejs.renderFileToString("templates/consultas.ejs", data);
});

app.addEventListener("error", (evt) => {
  // Will log the thrown error to the console.
  console.log(evt.error);
});


app.use(async (ctx, next) => {
	console.log(`${ctx.request.method} ${ctx.request.url}`);
	await next();
});
app.use(router.routes());

console.log("listening on localhost:8073");
await app.listen({ port: 8073});

// Close connection
db.close();
