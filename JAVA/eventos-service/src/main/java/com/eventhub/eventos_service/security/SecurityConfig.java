package com.eventhub.eventos_service.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;
import org.springframework.http.HttpMethod;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Autowired
    private JwtValidationService jwtValidationService;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .authorizeHttpRequests(auth -> auth
                // PERMITE LISTAR EVENTOS SEM LOGIN
                .requestMatchers(HttpMethod.GET, "/eventos/**").permitAll()
                // O resto exige login (criar evento, deletar, etc)
                .anyRequest().authenticated()
            )
            .addFilterBefore(new JwtTokenFilter(jwtValidationService), UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    // Classe interna para o Filtro (pode ser separada se preferires)
    public static class JwtTokenFilter extends OncePerRequestFilter {

        private final JwtValidationService jwtService;

        public JwtTokenFilter(JwtValidationService jwtService) {
            this.jwtService = jwtService;
        }

        @Override
        protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
                throws ServletException, IOException {

            String authHeader = request.getHeader("Authorization");

            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                String token = authHeader.substring(7);
                String email = jwtService.validarTokenEObterEmail(token);

                if (email != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                    // Token válido! Criamos a autenticação no contexto do Spring
                    UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                            email, null, Collections.emptyList());
                    SecurityContextHolder.getContext().setAuthentication(auth);
                    
                    // Requisito do Professor: Logar acesso
                    System.out.println("LOG DE ACESSO: Usuário " + email + " acessou " + request.getRequestURI());
                }
            }

            filterChain.doFilter(request, response);
        }
    }
}