export const normalizeName = (name: string): string => {
  if (!name) return "";
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Eliminar acentos
    .replace(/[^\w\s]/g, " ")         // Reemplazar caracteres especiales (incluyendo comas) por espacios
    .replace(/\s+/g, " ")           // Colapsar múltiples espacios (incluye NBSP \u00A0)
    .trim();
};

export const parseTechnicianInput = (input: string) => {
  // Ejemplos de entrada:
  // "GOMEZ, RAUL (DNI-12345678)"
  // "12345678 GOMEZ RAUL"
  // "GOMEZ RAUL 12345678"
  // "GOMEZ RAUL"

  const cleanInput = input.trim();
  
  // Caso 1: Formato con DNI explícito "(DNI-12345678)"
  const dniMatch = cleanInput.match(/\(DNI-([0-9]+)\)/i);
  if (dniMatch) {
    const dni = dniMatch[1];
    const namePart = cleanInput.replace(/\(DNI-[0-9]+\)/i, "").trim();
    return { name: namePart, dni, normalized: normalizeName(namePart) };
  }

  // Caso 2: Formato TOA: "DNI-XXXXXXXX - NOMBRE"
  const toaMatch = cleanInput.match(/DNI-?(\d+)\s*[-:]?\s*(.*)/i);
  if (toaMatch) {
    const dni = toaMatch[1];
    const namePart = toaMatch[2].trim();
    return { name: namePart, dni, normalized: normalizeName(namePart) };
  }

  // Caso 3: El DNI está al principio o al final (8 dígitos seguidos)
  const numericMatch = cleanInput.match(/(\d{7,8})/);
  if (numericMatch) {
    const dni = numericMatch[1];
    const namePart = cleanInput.replace(dni, "").replace(/^[-\s]+|[-\s]+$/g, "").trim();
    return { name: namePart, dni, normalized: normalizeName(namePart) };
  }

  // Caso 4: Solo nombre
  return { name: cleanInput, dni: null, normalized: normalizeName(cleanInput) };
};
