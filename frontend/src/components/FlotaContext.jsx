import React, { createContext, useState, useEffect, useContext } from "react";
import { supabase } from "../supabaseClient";

const FlotaContext = createContext();

export const FlotaProvider = ({ children }) => {
  const [flotaSeleccionada, setFlotaSeleccionada] = useState(null);
  const [buques, setBuques] = useState([]);

  useEffect(() => {
    const cargarBuques = async () => {
      if (!flotaSeleccionada) return;
      const { data, error } = await supabase
        .from("buques")
        .select("nombre")
        .eq("flota_id", flotaSeleccionada.id);

      if (!error) setBuques(data.map((b) => b.nombre));
      else console.error("Error cargando buques:", error);
    };

    cargarBuques();
  }, [flotaSeleccionada]);

  return (
    <FlotaContext.Provider value={{ flotaSeleccionada, setFlotaSeleccionada, buques }}>
      {children}
    </FlotaContext.Provider>
  );
};

export const useFlota = () => useContext(FlotaContext);
