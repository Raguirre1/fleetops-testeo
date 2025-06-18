// EmailUsuarios.jsx

const emailToNombre = {
  "raguirre@cotenaval.es": "Rafael Aguirre Delgado",
  "rgarcia@cotenaval.es": "Reyes García Vargas ",
  "acampderros@cotenavla.es": "Angel Campderrós",
  // Añade más usuarios aquí
};

export function obtenerNombreDesdeEmail(email) {
  return emailToNombre[email] || email || "Desconocido";
}
