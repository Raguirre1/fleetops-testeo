// EmailUsuarios.jsx

const emailToNombre = {
  "raguirre@cotenaval.es": "Rafael Aguirre Delgado",
  "rgarcia@cotenaval.es": "Reyes García Vargas ",
  "acampderros@cotenavla.es": "Angel Campderrós",
  "jpoblet@cotenaval.es": "José Poblet",
  "jcroger@cotenaval.es": "Jose C. Roger ",
  "ngalafat@cotenaval.es": "Noelia Galafat ",
};

export function obtenerNombreDesdeEmail(email) {
  return emailToNombre[email] || email || "Desconocido";
}
