import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Input,
  Heading,
  useToast,
  Text,
  Spinner,
} from "@chakra-ui/react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [error, setError] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [updated, setUpdated] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  // ✅ Recuperar sesión desde el hash de la URL
  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const params = new URLSearchParams(hash.replace("#", "?"));
      const access_token = params.get("access_token");
      const refresh_token = params.get("refresh_token");
      if (access_token && refresh_token) {
        supabase.auth.setSession({ access_token, refresh_token });
      }
    }
  }, []);

  const handleUpdatePassword = async () => {
    setError("");
    if (password !== confirmar) {
      setError("Las contraseñas no coinciden");
      return;
    }

    setIsUpdating(true);
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        status: "error",
        duration: 4000,
        isClosable: true,
      });
      setIsUpdating(false);
    } else {
      toast({
        title: "Contraseña actualizada",
        description: "Redirigiendo al login...",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      setUpdated(true);
      setTimeout(() => {
        navigate("/");
      }, 3000);
    }
  };

  return (
    <Flex align="center" justify="center" minH="100vh" bg="gray.100">
      <Box bg="white" p={8} rounded="md" shadow="md" maxW="sm" w="full">
        <Heading as="h2" size="lg" mb={6} textAlign="center">
          Restablecer contraseña
        </Heading>

        {updated ? (
          <Flex direction="column" align="center">
            <Spinner size="lg" mb={4} />
            <Text fontSize="md">Redirigiendo al login...</Text>
          </Flex>
        ) : (
          <>
            <FormControl mb={4}>
              <FormLabel>Nueva contraseña</FormLabel>
              <Input
                type="password"
                placeholder="Introduce tu nueva contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </FormControl>

            <FormControl mb={4}>
              <FormLabel>Confirmar contraseña</FormLabel>
              <Input
                type="password"
                placeholder="Repite la contraseña"
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
              />
            </FormControl>

            {error && (
              <Text color="red.500" fontSize="sm" mb={2}>
                {error}
              </Text>
            )}

            <Button
              colorScheme="blue"
              width="full"
              onClick={handleUpdatePassword}
              isLoading={isUpdating}
              loadingText="Actualizando..."
            >
              Actualizar contraseña
            </Button>
          </>
        )}
      </Box>
    </Flex>
  );
};

export default ResetPassword;
