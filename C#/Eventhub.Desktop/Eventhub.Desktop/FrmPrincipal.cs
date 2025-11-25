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
                EventoService service = new EventoService();
                var lista = await service.ListarEventos();

                // Joga a lista direto na tabela. O C# cria as colunas sozinho!
                dataGridView1.DataSource = lista;
            }
            catch (Exception ex)
            {
                MessageBox.Show("Erro ao carregar eventos: " + ex.Message);
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

                if (confirmacao == DialogResult.Yes)
                {
                    InscricaoService service = new InscricaoService();

                    //Recebe a String com o resultado da inscrição
                    string resultado = await service.Inscrever(Sessao.UsuarioId, eventoSelecionado.Id);

                    if (resultado == "OK")
                    {
                        MessageBox.Show("Inscrição realizada com sucesso! 🎉", "Sucesso", MessageBoxButtons.OK, MessageBoxIcon.Information);
                    }
                    else
                    {
                        // Mostra EXATAMENTE o que o Java respondeu (Ex: Usuário já inscrito)
                        MessageBox.Show("Atenção: " + resultado, "Aviso", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                    }
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
                        MessageBox.Show("Presença confirmada com sucesso! ✅\nO certificado já estará disponível.", "Sucesso", MessageBoxButtons.OK, MessageBoxIcon.Information);
                    }
                    else
                    {
                        // Mostra o erro (ex: já fez check-in) ou uma mensagem genérica se vier vazio
                        if (string.IsNullOrEmpty(resultado)) resultado = "Erro ao registrar. Verifique se já não foi feito.";

                        MessageBox.Show("Atenção: " + resultado, "Aviso", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                    }
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show("Erro técnico: " + ex.Message);
            }
        }
    }
}