const spinners = document.getElementById("load");
const sendBtn = document.getElementById("sendBtn");
const responseElement = document.getElementById("response");
const questionInput = document.getElementById("question");

// Evento click en el botón para enviar la pregunta
sendBtn.addEventListener("click", async () => {
  // Mostrar el spinner de carga
  spinners.classList.remove("hidden");

  // Limpiar la respuesta previa
  responseElement.innerText = "";

  // Llamar a la función para realizar la consulta
  await askQuestion();

  // Detener la animación de carga
  spinners.classList.add("hidden");
});

// Función que envía la pregunta al servidor
async function askQuestion() {
  const question = document.getElementById('question').value;
  let urlLocal = 'http://localhost:3000'
  let urlRail = 'https://docsbot-v2-production.up.railway.app'
  let url = window.location.hostname.includes('localhost') ? urlLocal : urlRail;
  
  try {
      const response = await fetch( url+'/ask', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
          },
          body: JSON.stringify({ question }),
      });
      
      if (!response.ok) {
          throw new Error('Error en la respuesta del servidor');
      }
      
      const data = await response.json();
      document.getElementById('response').textContent = data.answer;
  } catch (error) {
      console.error('Error al hacer la pregunta:', error);
      document.getElementById('response').textContent = 'Hubo un error al hacer la pregunta.';
  }
}