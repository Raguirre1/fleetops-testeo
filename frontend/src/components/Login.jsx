import React, { useState } from "react";
import {
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Input,
  Heading,
  Text,
  useToast,
} from "@chakra-ui/react";
import { supabase } from "../supabaseClient"; // Asegúrate de tener este archivo

const Login = ({ onLoginSuccess }) => {
  const [nombre, setNombre] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const toast = useToast();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: nombre, // Supabase requiere email como identificador
        password,
      });

      if (error) throw error;

      const { user } = data;
      localStorage.setItem("nombre", user.email);
      onLoginSuccess(user);

      toast({
        title: "Sesión iniciada",
        description: `Bienvenido, ${user.email}`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (err) {
      console.error("Error de login:", err.message);
      setError("Credenciales incorrectas");
      toast({
        title: "Error",
        description: "Usuario o contraseña incorrectos.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  return (
    <Flex align="center" justify="center" minH="100vh" bg="gray.100">
      <Box bg="white" p={8} rounded="md" shadow="md" w="full" maxW="sm">
        <Heading as="h2" size="lg" mb={6} textAlign="center">
          Iniciar sesión
        </Heading>
        <form onSubmit={handleLogin}>
          <FormControl id="usuario" mb={4} isRequired>
            <FormLabel>Email</FormLabel>
            <Input
              type="email"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Tu correo electrónico"
            />
          </FormControl>
          <FormControl id="password" mb={4} isRequired>
            <FormLabel>Contraseña</FormLabel>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña"
            />
          </FormControl>
          {error && <Text color="red.500" fontSize="sm" mb={3}>{error}</Text>}
          <Button type="submit" colorScheme="blue" width="full">
            Entrar
          </Button>
        </form>
      </Box>
    </Flex>
  );
};

export default Login;
