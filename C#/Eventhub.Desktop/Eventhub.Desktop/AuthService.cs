using System;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using Newtonsoft.Json;

namespace Eventhub.Desktop
{
    public class AuthService
    {
        private const string BASE_URL = "http://177.44.248.77:8081/auth";

        private static readonly HttpClient client = new HttpClient();

        public async Task<string> Login(string email, string senha)
        {
            // 1. Cria o objeto com os dados
            var loginData = new
            {
                email = email,
                senha = senha
            };

            // 2. Transforma em JSON
            var json = JsonConvert.SerializeObject(loginData);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            try
            {
                // 3. Envia para a VM (via Túnel)
                var response = await client.PostAsync(BASE_URL, content);

                if (response.IsSuccessStatusCode)
                {
                    // 4. Lê a resposta (Token)
                    var responseString = await response.Content.ReadAsStringAsync();
                    dynamic dados = JsonConvert.DeserializeObject(responseString);

                    string token = dados.token;

                    // 5. Extrai o ID que está escondido dentro do Token
                    long idUsuario = ExtrairIdDoToken(token);

                    // 6. Guarda TUDO na Sessão Global (para usar na Inscrição depois)
                    Sessao.Token = token;
                    Sessao.EmailUsuario = email;
                    Sessao.UsuarioId = idUsuario;

                    return token;
                }
                else
                {
                    return null; // Login falhou
                }
            }
            catch (Exception ex)
            {
                throw new Exception("Erro ao conectar na VM: " + ex.Message);
            }
        }

        // Método auxiliar para "abrir" o Token e ler o ID
        private long ExtrairIdDoToken(string token)
        {
            try
            {
                // O token tem 3 partes: Header.Payload.Signature. Queremos o meio (Payload).
                string payloadCodificado = token.Split('.')[1];

                // Corrige o tamanho da string para Base64 válido (adiciona =)
                switch (payloadCodificado.Length % 4)
                {
                    case 2: payloadCodificado += "=="; break;
                    case 3: payloadCodificado += "="; break;
                }

                // Decodifica de Base64 para Texto
                var bytes = Convert.FromBase64String(payloadCodificado);
                string jsonString = Encoding.UTF8.GetString(bytes);

                // Converte para objeto e pega o ID
                dynamic dados = JsonConvert.DeserializeObject(jsonString);
                return dados.id; // O campo "id" que o Java inseriu
            }
            catch
            {
                return 0; // Se der erro, retorna 0
            }
        }
    }
}