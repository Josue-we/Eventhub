package com.eventhub.certificados_service.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "certificados")
@Data
public class Certificado {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long usuarioId;
    private Long eventoId;
    
    private String nomeUsuario;
    private String nomeEvento;

    private String codigoAutenticacao;
    private LocalDateTime dataEmissao = LocalDateTime.now();
}