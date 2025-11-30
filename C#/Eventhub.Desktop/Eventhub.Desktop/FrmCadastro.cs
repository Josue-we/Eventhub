using System;
using System.Windows.Forms;

namespace Eventhub.Desktop
{
    public partial class FrmCadastro : Form
    {
        public FrmCadastro()
        {
            InitializeComponent();
        }

        private async void btnSalvar_Click(object sender, EventArgs e)
        {
            // 1. Validação dos campos
            if (string.IsNullOrWhiteSpace(txtNome.Text) || string.IsNullOrWhiteSpace(txtEmail.Text) || string.IsNullOrWhiteSpace(txtSenha.Text))
            {
                MessageBox.Show("Preencha todos os campos!", "Aviso");
                return;
            }

            try
            {
                // 2. Chama o serviço de cadastro
                UsuarioService service = new UsuarioService();
                string resultado = await service.Cadastrar(txtNome.Text, txtEmail.Text, txtSenha.Text);

                // 3. Verifica o resultado
                if (resultado == "OK")
                {
                    MessageBox.Show("Usuário cadastrado na nuvem com sucesso! ☁️\nAgora você pode fazer login.", "Sucesso Online");
                    this.Close(); // Fecha a tela e volta para o login
                }
                else if (resultado == "OFFLINE_OK")
                {
                    MessageBox.Show("Sem conexão com o servidor.\n\nUsuário salvo localmente! 💾\nVocê já pode fazer login neste computador.", "Modo Offline", MessageBoxButtons.OK, MessageBoxIcon.Information);
                    this.Close();
                }
                else
                {
                    MessageBox.Show("Erro ao cadastrar: " + resultado, "Erro", MessageBoxButtons.OK, MessageBoxIcon.Error);
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show("Erro técnico no formulário: " + ex.Message);
            }
        }
    }
}