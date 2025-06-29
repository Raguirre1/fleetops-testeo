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
import { supabase } from "../supabaseClient";
import LogoFleetOps from "./LogoFleetOps"; // Ajusta la ruta si está en otro sitio

const Login = ({ onLoginSuccess }) => {
  const [nombre, setNombre] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [mostrarRecuperacion, setMostrarRecuperacion] = useState(false);
  const [emailRecuperacion, setEmailRecuperacion] = useState("");
  const toast = useToast();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: nombre,
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

  const handlePasswordReset = async () => {
    const { error } = await supabase.auth.resetPasswordForEmail(emailRecuperacion);
    if (error) {
      toast({
        title: "Error al enviar el correo",
        description: error.message,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } else {
      toast({
        title: "Correo de recuperación enviado",
        description: "Revisa tu bandeja de entrada.",
        status: "success",
        duration: 4000,
        isClosable: true,
      });
      setMostrarRecuperacion(false);
      setEmailRecuperacion("");
    }
  };

  return (
    <Flex align="center" justify="center" minH="100vh" bg="gray.100">
      <Box bg="white" p={8} rounded="md" shadow="md" w="full" maxW="sm">
        <Flex justify="center" mb={6}>
          <LogoFleetOps height={300} />
        </Flex>
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
              autoComplete="email"
            />
          </FormControl>
          <FormControl id="password" mb={2} isRequired>
            <FormLabel>Contraseña</FormLabel>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña"
              autoComplete="current-password"
            />
          </FormControl>

          <Text
            color="blue.500"
            fontSize="sm"
            mb={3}
            cursor="pointer"
            onClick={() => setMostrarRecuperacion(!mostrarRecuperacion)}
          >
            ¿Olvidaste tu contraseña?
          </Text>

          {mostrarRecuperacion && (
            <Box mb={4} bg="gray.50" p={3} rounded="md">
              <FormControl id="recuperacion" mb={2}>
                <FormLabel>Introduce tu email</FormLabel>
                <Input
                  type="email"
                  value={emailRecuperacion}
                  onChange={(e) => setEmailRecuperacion(e.target.value)}
                  placeholder="Correo electrónico"
                />
              </FormControl>
              <Button colorScheme="blue" size="sm" onClick={handlePasswordReset}>
                Enviar enlace de recuperación
              </Button>
            </Box>
          )}

          {error && (
            <Text color="red.500" fontSize="sm" mb={3}>
              {error}
            </Text>
          )}

          <Button type="submit" colorScheme="blue" width="full">
            Entrar
          </Button>
        </form>
      </Box>
    </Flex>
  );
};

export default Login;
