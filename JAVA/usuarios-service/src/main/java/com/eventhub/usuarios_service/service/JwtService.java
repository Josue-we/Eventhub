package com.eventhub.usuarios_service.service;

import com.eventhub.usuarios_service.model.Usuario;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.function.Function;

@Service
public class JwtService {

    // A chave deve ser a mesma para gerar e para ler
    private static final String SECRET = "MEGA_CHAVE_SECRETA_EVENT_HUB_2025_SUPER_SEGURA";

    // Método auxiliar para gerar a chave criptográfica
    private SecretKey getChaveAssinatura() {
        byte[] keyBytes = SECRET.getBytes(StandardCharsets.UTF_8);
        return Keys.hmacShaKeyFor(keyBytes);
    }

    // 1. Gerar Token (O que tu já tinhas, levemente ajustado)
    public String gerarToken(Usuario usuario) {
        return Jwts.builder()
                .subject(usuario.getEmail())
                .claim("id", usuario.getId())
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + 86400000)) // 24h
                .signWith(getChaveAssinatura(), Jwts.SIG.HS256)
                .compact();
    }

    // 2. Extrair o Email (Subject) do Token - O método que faltava!
    public String extrairEmail(String token) {
        return extrairClaim(token, Claims::getSubject);
    }

    // 3. Método genérico para extrair qualquer dado do token
    public <T> T extrairClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extrairTodasClaims(token);
        return claimsResolver.apply(claims);
    }

    // 4. Lê o token e verifica a assinatura
    private Claims extrairTodasClaims(String token) {
        return Jwts.parser()
                .verifyWith(getChaveAssinatura()) // Verifica se a chave é a mesma
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
    
    // 5. Validar se o token é válido (opcional, mas recomendado para o filtro)
    public boolean isTokenValido(String token, String emailUsuario) {
        final String emailNoToken = extrairEmail(token);
        return (emailNoToken.equals(emailUsuario) && !isTokenExpirado(token));
    }

    private boolean isTokenExpirado(String token) {
        return extrairExpiration(token).before(new Date());
    }

    private Date extrairExpiration(String token) {
        return extrairClaim(token, Claims::getExpiration);
    }
}