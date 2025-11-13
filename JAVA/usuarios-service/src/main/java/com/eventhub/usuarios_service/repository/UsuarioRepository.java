package com.eventhub.usuarios_service.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.eventhub.usuarios_service.model.Usuario;

public interface UsuarioRepository extends JpaRepository<Usuario, Long> {
    Usuario findByEmail(String email);
}
