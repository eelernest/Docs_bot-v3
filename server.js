import express from 'express';
import { OpenAI } from 'openai';
import dotenv from 'dotenv';
import cors from 'cors';
import session from 'express-session'; // Para gestionar sesiones
import path from 'path'; // Para manejar rutas de archivos estáticos
import { fileURLToPath } from 'url'; // Necesario para emular __dirname

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Habilitar CORS
app.use(cors());
app.use(express.json());

// Configurar las sesiones
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: process.env.NODE_ENV === 'production' } // Configurar secure: true si es HTTPS
}));

// Inicia el cliente OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Open AI API_key
});

// Crea un nuevo thread de OpenAI
async function createNewThread() {
  const newThread = await openai.beta.threads.create();
  return newThread.id;
}

// Agrega un mensaje a un thread
async function addMessage(threadId, message) {
  const messageResponse = await openai.beta.threads.messages.create(threadId, {
    role: "user",
    content: message
  });
  return messageResponse;
}

// Obtiene los mensajes de un thread
async function getMessages(asistente, thread) {
  console.log("thinking...");
  const run = await openai.beta.threads.runs.create(thread, {
    assistant_id: asistente
  });
  while (true) {
    const runInfo = await openai.beta.threads.runs.retrieve(thread, run.id);
    if (runInfo.status === "completed") {
      break;
    }
    console.log("waiting 1 sec...");
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  const messages = await openai.beta.threads.messages.list(thread);
  const messageContent = messages.data[0].content[0].text.value;
  return messageContent;
}

// Ruta para hacer la consulta a OpenAI
app.post("/ask", async (req, res) => {
  const { question, textContent } = req.body;
  const asistente = process.env.ASSISTANT_ID; // ASSISTANT_ID
  
  // Si el usuario no tiene un thread en la sesión, creamos uno nuevo
  if (!req.session.threadId) {
    req.session.threadId = await createNewThread();
    console.log(`Nuevo thread creado: ${req.session.threadId}`);
  }
  
  const thread = req.session.threadId;
  const mensaje = `${textContent}\n\nPregunta: ${question}`;

  try {
    // Agregar el mensaje al hilo
    await addMessage(thread, mensaje);
    
    // Obtener la respuesta de OpenAI
    const ultimoMensaje = await getMessages(asistente, thread);

    res.json({ answer: ultimoMensaje.trim() });
  } catch (error) {
    console.error('Error al consultar OpenAI:', error);
    res.status(500).json({ error: "Error al consultar OpenAI" });
  }
});

// Sirve los archivos estáticos "public"
app.use(express.static(path.join(__dirname, 'public')));

// Ruta para servir el frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Inicia el servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
