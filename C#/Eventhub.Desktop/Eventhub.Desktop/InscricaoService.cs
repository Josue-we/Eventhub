using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Threading.Tasks;
using Newtonsoft.Json;

namespace Eventhub.Desktop
{
    public class InscricaoService
    {
        //IP da VM com a API de Inscrições
        private const string BASE_URL = "http://177.44.248.77:8084/inscricoes";

        private static readonly HttpClient client = new HttpClient();
        public async Task<string> Inscrever(long usuarioId, long eventoId)
        {
            client.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", Sessao.Token);

            var dados = new { usuarioId = usuarioId, eventoId = eventoId };
            var json = JsonConvert.SerializeObject(dados);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            try
            {
                var response = await client.PostAsync(BASE_URL, content);

                // Se deu certo (200 OK)
                if (response.IsSuccessStatusCode)
                {
                    return "OK";
                }

                // Se deu erro (400 Bad Request), lê a mensagem que o Java mandou
                string erroDoJava = await response.Content.ReadAsStringAsync();
                return erroDoJava;
            }
            catch (Exception ex)
            {
                return "Erro de conexão: " + ex.Message;
            }
        }
    }
}