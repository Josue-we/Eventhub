using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Threading.Tasks;
using Newtonsoft.Json;

namespace Eventhub.Desktop
{
    public class CertificadoService
    {
        //IP da VM na porta 8085
        private const string BASE_URL = "http://177.44.248.77:8085/certificados";

        private static readonly HttpClient client = new HttpClient();

        public async Task<string> EmitirCertificado(long usuarioId, long eventoId)
        {
            client.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", Sessao.Token);

            var dados = new { usuarioId = usuarioId, eventoId = eventoId };
            var json = JsonConvert.SerializeObject(dados);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            try
            {
                var response = await client.PostAsync(BASE_URL, content);
                var jsonResposta = await response.Content.ReadAsStringAsync();

                if (response.IsSuccessStatusCode)
                {
                    dynamic certificado = JsonConvert.DeserializeObject(jsonResposta);
                    return certificado.codigoAutenticacao;
                }

                return "ERRO: " + jsonResposta;
            }
            catch (Exception ex)
            {
                return "Erro de conexão: " + ex.Message;
            }
        }
    }
}