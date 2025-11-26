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
            // TENTATIVA 1: ONLINE
            try
            {
                client.DefaultRequestHeaders.Authorization =
                    new AuthenticationHeaderValue("Bearer", Sessao.Token);

                var dados = new { usuarioId = usuarioId, eventoId = eventoId };
                var json = JsonConvert.SerializeObject(dados);
                var content = new StringContent(json, Encoding.UTF8, "application/json");

                var response = await client.PostAsync(BASE_URL, content);

                if (response.IsSuccessStatusCode) return "OK";

                // Se o servidor respondeu (ex: erro 400), retorna o erro real
                return await response.Content.ReadAsStringAsync();
            }
            catch (Exception)
            {
                // SE FALHAR CONEXÃO (OFFLINE):
                try
                {
                    LocalDbService db = new LocalDbService();
                    // Guarda na fila para depois
                    db.AdicionarFilaPresenca(Sessao.EmailUsuario, eventoId);
                    return "OFFLINE_OK";
                }
                catch (Exception exLocal)
                {
                    return "Erro total: " + exLocal.Message;
                }
            }
        }
    }
}