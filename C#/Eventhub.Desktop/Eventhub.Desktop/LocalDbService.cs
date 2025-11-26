using System.Data.SQLite;
using System.IO;

namespace Eventhub.Desktop
{
    public class LocalDbService
    {
        // O banco será um arquivo "eventhub_local.db" na pasta do executável
        private const string STRING_CONEXAO = "Data Source=eventhub_local.db;Version=3;";

        public void InicializarBanco()
        {
            if (!File.Exists("eventhub_local.db"))
            {
                SQLiteConnection.CreateFile("eventhub_local.db");
            }

            using (var conexao = new SQLiteConnection(STRING_CONEXAO))
            {
                conexao.Open();

                string sql = @"
                    -- Tabela para guardar os eventos (Cache)
                    CREATE TABLE IF NOT EXISTS Eventos (
                        Id INTEGER PRIMARY KEY,
                        Nome TEXT,
                        Descricao TEXT,
                        Local TEXT
                    );

                    -- Tabela para guardar usuários (Cache e Novos)
                    CREATE TABLE IF NOT EXISTS Usuarios (
                        Id INTEGER, -- Pode ser null se for novo
                        Nome TEXT,
                        Email TEXT PRIMARY KEY,
                        Senha TEXT,
                        NovoLocalmente INTEGER DEFAULT 0 -- 1 se foi criado offline
                    );

                    -- Fila de Inscrições para Sincronizar
                    CREATE TABLE IF NOT EXISTS FilaInscricoes (
                        Id INTEGER PRIMARY KEY AUTOINCREMENT,
                        EmailUsuario TEXT,
                        EventoId INTEGER,
                        Sincronizado INTEGER DEFAULT 0
                    );

                    -- Fila de Presenças para Sincronizar
                    CREATE TABLE IF NOT EXISTS FilaPresencas (
                        Id INTEGER PRIMARY KEY AUTOINCREMENT,
                        EmailUsuario TEXT,
                        EventoId INTEGER,
                        Sincronizado INTEGER DEFAULT 0
                    );
                ";

                using (var comando = new SQLiteCommand(sql, conexao))
                {
                    comando.ExecuteNonQuery();
                }
            }
        }
        //limpa e salva a nova lista
        public void AtualizarCacheEventos(List<Evento> eventosDaNuvem)
        {
            using (var conexao = new SQLiteConnection(STRING_CONEXAO))
            {
                conexao.Open();
                using (var transacao = conexao.BeginTransaction())
                {
                    try
                    {
                        // 1. Limpa a tabela antiga
                        new SQLiteCommand("DELETE FROM Eventos", conexao).ExecuteNonQuery();

                        // 2. Insere os novos dados
                        foreach (var evento in eventosDaNuvem)
                        {
                            var cmd = new SQLiteCommand("INSERT INTO Eventos (Id, Nome, Descricao, Local) VALUES (@id, @nome, @desc, @local)", conexao);
                            cmd.Parameters.AddWithValue("@id", evento.Id);
                            cmd.Parameters.AddWithValue("@nome", evento.Nome);
                            cmd.Parameters.AddWithValue("@desc", evento.Descricao);
                            cmd.Parameters.AddWithValue("@local", evento.Local);
                            cmd.ExecuteNonQuery();
                        }

                        transacao.Commit();
                    }
                    catch
                    {
                        transacao.Rollback();
                        throw;
                    }
                }
            }
        }
        //le do banco local (quando offline)
        public List<Evento> ListarEventosOffline()
        {
            var lista = new List<Evento>();

            using (var conexao = new SQLiteConnection(STRING_CONEXAO))
            {
                conexao.Open();
                var cmd = new SQLiteCommand("SELECT Id, Nome, Descricao, Local FROM Eventos", conexao);

                using (var reader = cmd.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        lista.Add(new Evento
                        {
                            Id = Convert.ToInt64(reader["Id"]),
                            Nome = reader["Nome"].ToString(),
                            Descricao = reader["Descricao"].ToString(),
                            Local = reader["Local"].ToString()
                        });
                    }
                }
            }
            return lista;
        }
        //salva ou atualiza o usuário no banco local
        public void SalvarUsuarioLocal(long id, string email, string senha)
        {
            using (var conexao = new SQLiteConnection(STRING_CONEXAO))
            {
                conexao.Open();
                // INSERT OR REPLACE: Se o email já existe, atualiza. Se não, cria.
                string sql = "INSERT OR REPLACE INTO Usuarios (Id, Email, Senha) VALUES (@id, @email, @senha)";

                using (var cmd = new SQLiteCommand(sql, conexao))
                {
                    cmd.Parameters.AddWithValue("@id", id);
                    cmd.Parameters.AddWithValue("@email", email);
                    cmd.Parameters.AddWithValue("@senha", senha);
                    cmd.ExecuteNonQuery();
                }
            }
        }

        // acha o usuário no banco local
        public long AutenticarUsuarioLocal(string email, string senha)
        {
            using (var conexao = new SQLiteConnection(STRING_CONEXAO))
            {
                conexao.Open();
                string sql = "SELECT Id FROM Usuarios WHERE Email = @email AND Senha = @senha";

                using (var cmd = new SQLiteCommand(sql, conexao))
                {
                    cmd.Parameters.AddWithValue("@email", email);
                    cmd.Parameters.AddWithValue("@senha", senha);

                    var resultado = cmd.ExecuteScalar();

                    if (resultado != null)
                    {
                        return Convert.ToInt64(resultado); // Retorna o ID do usuário
                    }
                }
            }
            return 0; // Não achou ou senha errada
        }
        public void AdicionarFilaInscricao(string emailUsuario, long eventoId)//inscreve offline
        {
            using (var conexao = new SQLiteConnection(STRING_CONEXAO))
            {
                conexao.Open();
                string sql = "INSERT INTO FilaInscricoes (EmailUsuario, EventoId, Sincronizado) VALUES (@email, @eventoId, 0)";

                using (var cmd = new SQLiteCommand(sql, conexao))
                {
                    cmd.Parameters.AddWithValue("@email", emailUsuario);
                    cmd.Parameters.AddWithValue("@eventoId", eventoId);
                    cmd.ExecuteNonQuery();
                }
            }
        }
        public void AdicionarFilaPresenca(string emailUsuario, long eventoId)//checkin offline
        {
            using (var conexao = new SQLiteConnection(STRING_CONEXAO))
            {
                conexao.Open();
                string sql = "INSERT INTO FilaPresencas (EmailUsuario, EventoId, Sincronizado) VALUES (@email, @eventoId, 0)";

                using (var cmd = new SQLiteCommand(sql, conexao))
                {
                    cmd.Parameters.AddWithValue("@email", emailUsuario);
                    cmd.Parameters.AddWithValue("@eventoId", eventoId);
                    cmd.ExecuteNonQuery();
                }
            }
        }
        //buscar pendência retorna DataTable para facilitar
        public System.Data.DataTable ObterPendencias(string tabela)
        {
            using (var conexao = new SQLiteConnection(STRING_CONEXAO))
            {
                conexao.Open();
                var cmd = new SQLiteCommand($"SELECT * FROM {tabela} WHERE Sincronizado = 0", conexao);
                var adaptador = new System.Data.SQLite.SQLiteDataAdapter(cmd);
                var tabelaDados = new System.Data.DataTable();
                adaptador.Fill(tabelaDados);
                return tabelaDados;
            }
        }

        //marca como resolvido e remove da fila
        public void RemoverDaFila(string tabela, long id)
        {
            using (var conexao = new SQLiteConnection(STRING_CONEXAO))
            {
                conexao.Open();
                var cmd = new SQLiteCommand($"DELETE FROM {tabela} WHERE Id = @id", conexao);
                cmd.Parameters.AddWithValue("@id", id);
                cmd.ExecuteNonQuery();
            }
        }
    }
}