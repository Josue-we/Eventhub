using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Threading.Tasks;
using Newtonsoft.Json;

namespace Eventhub.Desktop
{
    public class PresencaService
    {
        // Porta 8083 - Presenças
        //IP da VM
        private const string BASE_URL = "http://177.44.248.77:8083/presencas";

        private static readonly HttpClient client = new HttpClient();

        public async Task<string> RegistrarPresenca(long usuarioId, long eventoId)
        {
            // Adiciona o Token
            client.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", Sessao.Token);

            var dados = new
            {
                usuarioId = usuarioId,
                eventoId = eventoId
            };

            var json = JsonConvert.SerializeObject(dados);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            try
            {
                var response = await client.PostAsync(BASE_URL, content);

                // Se deu 200 OK, deu certo
                if (response.IsSuccessStatusCode)
                {
                    return "OK";
                }

                // Se deu erro, tenta ler a mensagem do servidor
                return await response.Content.ReadAsStringAsync();
            }
            catch (Exception ex)
            {
                return "Erro de conexão: " + ex.Message;
            }
        }
    }
}