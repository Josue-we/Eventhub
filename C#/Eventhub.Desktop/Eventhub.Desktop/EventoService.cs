using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Headers; // Importante para o Header
using System.Threading.Tasks;

namespace Eventhub.Desktop
{
    public class EventoService
    {
        private const string BASE_URL = "http://localhost:8081/eventos";
        private const string API_URL = "http://177.44.248.77:8082/eventos";

        private static readonly HttpClient client = new HttpClient();

        public async Task<List<Evento>> ListarEventos()
        {
            // 1. Adiciona o Token no cabeçalho
            client.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", Sessao.Token);

            try
            {
                // 2. Faz o GET
                var response = await client.GetAsync(API_URL);

                if (response.IsSuccessStatusCode)
                {
                    // 3. Lê o JSON e transforma em lista de Eventos
                    var json = await response.Content.ReadAsStringAsync();
                    return JsonConvert.DeserializeObject<List<Evento>>(json);
                }
                else
                {
                    throw new Exception("Falha ao buscar eventos: " + response.StatusCode);
                }
            }
            catch (Exception ex)
            {
                throw new Exception("Erro de conexão: " + ex.Message);
            }
        }
    }
}