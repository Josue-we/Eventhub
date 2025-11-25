namespace Eventhub.Desktop
{
    // Classe estática para guardar dados globais enquanto o app está aberto
    public static class Sessao
    {
        // O Token JWT
        public static string Token { get; set; }

        // O E-mail do usuário logado
        public static string EmailUsuario { get; set; }

        // O ID numérico do usuário
        public static long UsuarioId { get; set; }
    }
}