package com.eventhub.inscricoes_service.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;

@Service
public class JwtValidationService {

    private static final String SECRET = "MEGA_CHAVE_SECRETA_EVENT_HUB_2025_SUPER_SEGURA";

    private SecretKey getChaveAssinatura() {
        byte[] keyBytes = SECRET.getBytes(StandardCharsets.UTF_8);
        return Keys.hmacShaKeyFor(keyBytes);
    }

    public String validarTokenEObterEmail(String token) {
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(getChaveAssinatura())
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
            return claims.getSubject();
        } catch (Exception e) {
            return null;
        }
    }
}