using System;
using System.Windows.Forms;

namespace Eventhub.Desktop
{
    public partial class FrmMinhasInscricoes : Form
    {
        public FrmMinhasInscricoes()
        {
            InitializeComponent();
        }

        private async void FrmMinhasInscricoes_Load(object sender, EventArgs e)
        {
            await CarregarLista();
        }

        private async System.Threading.Tasks.Task CarregarLista()
        {
            InscricaoService service = new InscricaoService();
            var tabela = await service.ListarMinhasInscricoes(Sessao.UsuarioId);
            gridInscricoes.DataSource = tabela;
        }

        private async void btnCancelar_Click(object sender, EventArgs e)
        {
            if (gridInscricoes.CurrentRow == null) return;

            // Pega o ID da inscrição da linha selecionada
            long idInscricao = Convert.ToInt64(gridInscricoes.CurrentRow.Cells["id"].Value);

            if (MessageBox.Show("Tem certeza que deseja cancelar?", "Cancelar", MessageBoxButtons.YesNo) == DialogResult.Yes)
            {
                InscricaoService service = new InscricaoService();
                bool sucesso = await service.CancelarInscricao(idInscricao);

                if (sucesso)
                {
                    MessageBox.Show("Inscrição cancelada.");
                    await CarregarLista(); // Recarrega a lista
                }
                else
                {
                    MessageBox.Show("Erro ao cancelar.");
                }
            }
        }
    }
}