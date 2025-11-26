namespace Eventhub.Desktop
{
    public partial class Form1 : Form
    {
        public Form1()
        {
            InitializeComponent();

            // Inicializa o banco local
            LocalDbService db = new LocalDbService();
            db.InicializarBanco();
        }

        private async void btnLogin_Click(object sender, EventArgs e)
        {
            // Desabilita o botão para não clicar duas vezes
            btnLogin.Enabled = false;
            btnLogin.Text = "Conectando...";

            try
            {
                AuthService auth = new AuthService();
                string token = await auth.Login(txtEmail.Text, txtSenha.Text);

                if (token != null)
                {
                    // 1. Guarda o token na memória
                    Sessao.Token = token;
                    Sessao.EmailUsuario = txtEmail.Text;

                    // 2. Abre a tela principal
                    FrmPrincipal principal = new FrmPrincipal();
                    principal.Show();

                    // 3. Esconde a tela de login
                    this.Hide();
                }
                else
                {
                    MessageBox.Show("E-mail ou senha inválidos.", "Erro", MessageBoxButtons.OK, MessageBoxIcon.Error);
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show("Erro técnico: " + ex.Message, "Erro", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
            finally
            {
                btnLogin.Enabled = true;
                btnLogin.Text = "Entrar";
            }
        }
    }
}
