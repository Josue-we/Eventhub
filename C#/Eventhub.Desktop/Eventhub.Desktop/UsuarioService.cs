using System;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using Newtonsoft.Json;

namespace Eventhub.Desktop
{
    public class UsuarioService
    {
        //IP da VM
        private const string BASE_URL = "http://177.44.248.77:8081/usuarios";

        private static readonly HttpClient client = new HttpClient();

        public async Task<string> Cadastrar(string nome, string email, string senha)
        {
            var dados = new { nome = nome, email = email, senha = senha };
            var json = JsonConvert.SerializeObject(dados);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            // TENTATIVA 1: ONLINE
            try
            {
                var response = await client.PostAsync(BASE_URL, content);

                if (response.IsSuccessStatusCode)
                {
                    // Se cadastrou na nuvem, salva no cache local também (para login futuro sem net)
                    try
                    {
                        LocalDbService db = new LocalDbService();
                        // Passamos 0 no ID pois não sabemos o ID da nuvem ainda, mas salvamos para cache
                        db.SalvarUsuarioLocal(0, email, senha);
                    }
                    catch { }

                    return "OK";
                }

                return await response.Content.ReadAsStringAsync();
            }
            catch (Exception)
            {
                // SE DEU ERRO DE CONEXÃO (OFFLINE):
                try
                {
                    LocalDbService db = new LocalDbService();
                    // Salva localmente para permitir o login imediato
                    db.SalvarNovoUsuarioOffline(nome, email, senha);

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