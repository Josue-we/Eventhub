package com.eventhub.usuarios_service.repository;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import com.eventhub.usuarios_service.model.Usuario;

public interface UsuarioRepository extends JpaRepository<Usuario, Long> {
    Optional<Usuario> findByEmail(String email);
}
