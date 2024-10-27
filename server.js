import express from 'express';
import { OpenAI } from 'openai';
import dotenv from 'dotenv';
import cors from 'cors';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Configuración de la sesión
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true, // Cambia a 'true' para forzar la creación de una sesión
  cookie: { secure: false } // Asegúrate de que esté en 'false' para entorno local sin HTTPS
}));


const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Función para crear un nuevo thread
async function createNewThread() {
  const newThread = await openai.beta.threads.create();
  console.log(`Thread creado: ${newThread.id}`);
  return newThread.id;
}

// Función para agregar mensaje a un thread existente
async function addMessage(threadId, message) {
  const messageResponse = await openai.beta.threads.messages.create(threadId, {
    role: "user",
    content: message
  });
  return messageResponse;
}

// Función para obtener el último mensaje en el thread
async function getMessages(asistente, thread) {
  console.log("Obteniendo respuesta de OpenAI...");
  const run = await openai.beta.threads.runs.create(thread, {
    assistant_id: asistente
  });
  while (true) {
    const runInfo = await openai.beta.threads.runs.retrieve(thread, run.id);
    if (runInfo.status === "completed") {
      break;
    }
    console.log("Esperando 1 segundo...");
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  const messages = await openai.beta.threads.messages.list(thread);
  const messageContent = messages.data[0].content[0].text.value;
  return messageContent;
}

// Ruta para hacer consultas a OpenAI
app.post("/ask", async (req, res) => {
  const { question, textContent } = req.body;
  const asistente = process.env.ASSISTANT_ID;

  console.log(`threadId actual en sesión: ${req.session.threadId}`);

  // Crea un nuevo thread solo si no existe uno en la sesión
  if (!req.session.threadId) {
    req.session.threadId = await createNewThread();
    console.log(`Nuevo thread asignado a la sesión: ${req.session.threadId}`);
  }

  const thread = req.session.threadId;
  const mensaje = `${textContent}\n\nPregunta: ${question}`;

  try {
    await addMessage(thread, mensaje);
    const ultimoMensaje = await getMessages(asistente, thread);
    res.json({ answer: ultimoMensaje.trim() });
  } catch (error) {
    console.error('Error al consultar OpenAI:', error);
    res.status(500).json({ error: "Error al consultar OpenAI" });
  }
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
