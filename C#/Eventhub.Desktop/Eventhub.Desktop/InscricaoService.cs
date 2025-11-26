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
            // TENTATIVA 1: ONLINE
            try
            {
                // Configura o Token
                client.DefaultRequestHeaders.Authorization =
                    new AuthenticationHeaderValue("Bearer", Sessao.Token);

                var dados = new { usuarioId = usuarioId, eventoId = eventoId };
                var json = JsonConvert.SerializeObject(dados);
                var content = new StringContent(json, Encoding.UTF8, "application/json");

                var response = await client.PostAsync(BASE_URL, content);

                if (response.IsSuccessStatusCode) return "OK";

                // Se o servidor respondeu erro (ex: 400), é erro de negócio (já inscrito), não salva offline!
                return await response.Content.ReadAsStringAsync();
            }
            catch (Exception)
            {
                // SE DEU ERRO DE CONEXÃO (CAIU NO CATCH):
                // Salva no banco local para enviar depois
                try
                {
                    LocalDbService db = new LocalDbService();
                    // Nota: Usamos o Email porque o ID pode mudar ou ser local temporário
                    db.AdicionarFilaInscricao(Sessao.EmailUsuario, eventoId);
                    return "OFFLINE_OK"; // Código especial para avisar a tela
                }
                catch (Exception exLocal)
                {
                    return "Erro total: " + exLocal.Message;
                }
            }
        }
    }
}