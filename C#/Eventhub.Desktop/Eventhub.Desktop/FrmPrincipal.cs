using System;
using System.Windows.Forms;

namespace Eventhub.Desktop
{
    public partial class FrmPrincipal : Form
    {
        public FrmPrincipal()
        {
            InitializeComponent();
        }

        private async void FrmPrincipal_Load(object sender, EventArgs e)
        {
            await CarregarEventos();
        }

        private async System.Threading.Tasks.Task CarregarEventos()
        {
            try
            {
                // 1. Tenta buscar na Nuvem (VM)
                EventoService service = new EventoService();
                var listaNuvem = await service.ListarEventos();

                // 2. Se deu certo, salva no Banco Local (Backup)
                LocalDbService db = new LocalDbService();
                db.AtualizarCacheEventos(listaNuvem);

                // Mostra na tela
                dataGridView1.DataSource = listaNuvem;
                this.Text = "EVENTHUB (Online 🟢)";
            }
            catch (Exception)
            {
                try
                {
                    LocalDbService db = new LocalDbService();
                    var listaLocal = db.ListarEventosOffline();

                    if (listaLocal.Count > 0)
                    {
                        dataGridView1.DataSource = listaLocal;
                        MessageBox.Show("Sem conexão com o servidor.\nMostrando dados salvos localmente.", "Modo Offline", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                        this.Text = "EVENTHUB (Offline 🔴)";
                    }
                    else
                    {
                        MessageBox.Show("Sem internet e sem dados locais.\nConecte-se para baixar os dados pela primeira vez.");
                    }
                }
                catch (Exception exLocal)
                {
                    MessageBox.Show("Erro fatal: " + exLocal.Message);
                }
            }
        }

        private async void button1_Click(object sender, EventArgs e)
        {
            await CarregarEventos();
        }
        protected override void OnFormClosed(FormClosedEventArgs e)
        {
            base.OnFormClosed(e);
            Application.Exit();
        }

        private async void btnInscrever_Click(object sender, EventArgs e)
        {
            // 1. Verifica se o usuário selecionou alguma linha na tabela
            if (dataGridView1.SelectedRows.Count == 0 && dataGridView1.CurrentRow == null)
            {
                MessageBox.Show("Por favor, selecione um evento na tabela primeiro!", "Aviso", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            try
            {
                // 2. Tenta pegar o objeto 'Evento' da linha selecionada
                // O 'DataBoundItem' contém o objeto original que veio da lista
                var linha = dataGridView1.CurrentRow;
                var eventoSelecionado = (Evento)linha.DataBoundItem;

                if (eventoSelecionado == null) return;

                // 3. Pergunta de confirmação (Boa prática de UX)
                var confirmacao = MessageBox.Show(
                    $"Deseja confirmar sua inscrição no evento:\n'{eventoSelecionado.Nome}'?",
                    "Confirmação de Inscrição",
                    MessageBoxButtons.YesNo,
                    MessageBoxIcon.Question);

                InscricaoService service = new InscricaoService();
                string resultado = await service.Inscrever(Sessao.UsuarioId, eventoSelecionado.Id);

                if (resultado == "OK")
                {
                    MessageBox.Show("Inscrição realizada com sucesso!", "Sucesso Online");
                }
                else if (resultado == "OFFLINE_OK")
                {
                    MessageBox.Show("Sem internet no momento.\n\nSua inscrição foi salva no dispositivo e será enviada assim que a conexão voltar!", "Modo Offline", MessageBoxButtons.OK, MessageBoxIcon.Information);
                }
                else
                {
                    MessageBox.Show("Atenção: " + resultado, "Aviso", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show("Erro técnico ao processar inscrição: " + ex.Message);
            }
        }

        private async void btnCheckin_Click(object sender, EventArgs e)
        {
            // 1. Valida se tem uma linha selecionada na tabela
            if (dataGridView1.SelectedRows.Count == 0 && dataGridView1.CurrentRow == null)
            {
                MessageBox.Show("Selecione o evento na lista para fazer o check-in.", "Atenção");
                return;
            }

            try
            {
                // 2. Pega os dados do evento selecionado
                var linha = dataGridView1.CurrentRow;
                var eventoSelecionado = (Evento)linha.DataBoundItem;

                // 3. Confirmação visual
                var confirmacao = MessageBox.Show(
                    $"Confirmar presença de '{Sessao.EmailUsuario}' no evento:\n\n{eventoSelecionado.Nome}?",
                    "Realizar Check-in",
                    MessageBoxButtons.YesNo,
                    MessageBoxIcon.Question);

                if (confirmacao == DialogResult.Yes)
                {
                    // 4. Chama o serviço de Presença
                    PresencaService service = new PresencaService();

                    // Envia o ID do Usuário logado + ID do Evento selecionado
                    string resultado = await service.RegistrarPresenca(Sessao.UsuarioId, eventoSelecionado.Id);

                    if (resultado == "OK")
                    {
                        MessageBox.Show("Presença confirmada!", "Sucesso Online");
                    }
                    else if (resultado == "OFFLINE_OK")
                    {
                        MessageBox.Show("Sem internet.\n\nO Check-in foi salvo localmente e será sincronizado depois!", "Modo Offline", MessageBoxButtons.OK, MessageBoxIcon.Information);
                    }
                    else
                    {
                        MessageBox.Show("Atenção: " + resultado, "Aviso", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                    }
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show("Erro técnico: " + ex.Message);
            }
        }

        private async void btnSync_Click(object sender, EventArgs e)
        {
            // 1. VERIFICAÇÃO INTELIGENTE
            // Se o token for o "falso" do modo offline, renova
            if (Sessao.Token == "TOKEN_OFFLINE" || Sessao.Token == "OFFLINE")
            {
                // Abre a janelinha de senha
                FrmSenha formSenha = new FrmSenha();
                if (formSenha.ShowDialog() == DialogResult.OK)
                {
                    string senha = formSenha.SenhaDigitada;

                    // Tenta logar na VM agora
                    AuthService auth = new AuthService();
                    string novoToken = await auth.Login(Sessao.EmailUsuario, senha);

                    if (novoToken != null && novoToken != "OFFLINE" && novoToken != "TOKEN_OFFLINE")
                    {
                        MessageBox.Show("Conexão restabelecida! 🟢\nIniciando sincronização...", "Online");
                        this.Text = "EVENTHUB (Online 🟢)";
                        // O método Login já atualizou o Sessao.Token, então podemos seguir!
                    }
                    else
                    {
                        MessageBox.Show("Senha incorreta ou sem internet. Não é possível sincronizar agora.", "Erro");
                        return; // Cancela a sincronização
                    }
                }
                else
                {
                    return; // Usuário cancelou a senha
                }
            }

            LocalDbService db = new LocalDbService();
            int sucessoInscricoes = 0;
            int sucessoPresencas = 0;

            // 1. Sincronizar Inscrições
            var filaInscricoes = db.ObterPendencias("FilaInscricoes");
            foreach (System.Data.DataRow row in filaInscricoes.Rows)
            {
                long eventoId = Convert.ToInt64(row["EventoId"]);
                long idFila = Convert.ToInt64(row["Id"]);

                InscricaoService service = new InscricaoService();
                string res = await service.Inscrever(Sessao.UsuarioId, eventoId);

                if (res == "OK" || res.Contains("já inscrito"))
                {
                    db.RemoverDaFila("FilaInscricoes", idFila);
                    sucessoInscricoes++;
                }
            }

            // 2. Sincronizar Presenças
            var filaPresencas = db.ObterPendencias("FilaPresencas");
            foreach (System.Data.DataRow row in filaPresencas.Rows)
            {
                long eventoId = Convert.ToInt64(row["EventoId"]);
                long idFila = Convert.ToInt64(row["Id"]);

                PresencaService service = new PresencaService();
                string res = await service.RegistrarPresenca(Sessao.UsuarioId, eventoId);

                if (res == "OK" || res.Contains("já realizou"))
                {
                    db.RemoverDaFila("FilaPresencas", idFila);
                    sucessoPresencas++;
                }
            }

            MessageBox.Show($"Sincronização concluída!\n\nInscrições enviadas: {sucessoInscricoes}\nPresenças enviadas: {sucessoPresencas}");
        }
    }
}