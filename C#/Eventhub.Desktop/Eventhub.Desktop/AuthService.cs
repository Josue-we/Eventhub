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
            // TENTATIVA 1: ONLINE (Via API)
            try
            {
                var loginData = new { email = email, senha = senha };
                var json = JsonConvert.SerializeObject(loginData);
                var content = new StringContent(json, Encoding.UTF8, "application/json");

                //tenta conectar na VM
                var response = await client.PostAsync(BASE_URL, content);

                if (response.IsSuccessStatusCode)
                {
                    var responseString = await response.Content.ReadAsStringAsync();
                    dynamic dados = JsonConvert.DeserializeObject(responseString);
                    string token = dados.token;
                    long idUsuario = ExtrairIdDoToken(token);

                    // SUCESSO ONLINE:
                    // 1. Configura a Sessão
                    Sessao.Token = token;
                    Sessao.EmailUsuario = email;
                    Sessao.UsuarioId = idUsuario;

                    // 2. Salva no Banco Local
                    try
                    {
                        LocalDbService db = new LocalDbService();
                        db.SalvarUsuarioLocal(idUsuario, email, senha);
                    }
                    catch { /* Ignora erro de banco local para não travar o login */ }

                    return token;
                }
            }
            catch (Exception)
            {
                // Se deu erro de conexão (Timeout, Sem internet, etc), cai aqui.
                // Não fazemos nada aqui, deixamos seguir para a TENTATIVA 2.
            }

            // TENTATIVA 2: OFFLINE (Banco Local)
            try
            {
                LocalDbService db = new LocalDbService();
                long idLocal = db.AutenticarUsuarioLocal(email, senha);

                if (idLocal > 0)
                {
                    // SUCESSO OFFLINE:
                    Sessao.Token = "TOKEN_OFFLINE"; // Token falso só para não ficar null
                    Sessao.EmailUsuario = email;
                    Sessao.UsuarioId = idLocal;

                    return "OFFLINE"; // Retorna algo diferente de null
                }
            }
            catch { }

            // Se chegou aqui, falhou Online e Offline
            return null;
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