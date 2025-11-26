using System;
using System.Windows.Forms;

namespace Eventhub.Desktop
{
    public partial class FrmSenha : Form
    {
        public string SenhaDigitada { get; private set; }

        public FrmSenha()
        {
            InitializeComponent();
            // Dica: Define no Design o botão 'AcceptButton' do form como btnConfirmar para funcionar o Enter
            this.StartPosition = FormStartPosition.CenterParent;
            this.FormBorderStyle = FormBorderStyle.FixedDialog;
            this.MaximizeBox = false;
            this.MinimizeBox = false;
        }

        private void btnConfirmar_Click(object sender, EventArgs e)
        {
            SenhaDigitada = txtSenha.Text;
            this.DialogResult = DialogResult.OK; // Diz ao código principal que o usuário confirmou
            this.Close();
        }
    }
}