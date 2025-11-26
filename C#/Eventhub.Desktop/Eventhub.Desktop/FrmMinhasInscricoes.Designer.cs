namespace Eventhub.Desktop
{
    partial class FrmMinhasInscricoes
    {
        /// <summary>
        /// Required designer variable.
        /// </summary>
        private System.ComponentModel.IContainer components = null;

        /// <summary>
        /// Clean up any resources being used.
        /// </summary>
        /// <param name="disposing">true if managed resources should be disposed; otherwise, false.</param>
        protected override void Dispose(bool disposing)
        {
            if (disposing && (components != null))
            {
                components.Dispose();
            }
            base.Dispose(disposing);
        }

        #region Windows Form Designer generated code

        /// <summary>
        /// Required method for Designer support - do not modify
        /// the contents of this method with the code editor.
        /// </summary>
        private void InitializeComponent()
        {
            gridInscricoes = new DataGridView();
            btnCancelar = new Button();
            ((System.ComponentModel.ISupportInitialize)gridInscricoes).BeginInit();
            SuspendLayout();
            // 
            // gridInscricoes
            // 
            gridInscricoes.AllowUserToAddRows = false;
            gridInscricoes.AllowUserToDeleteRows = false;
            gridInscricoes.ColumnHeadersHeightSizeMode = DataGridViewColumnHeadersHeightSizeMode.AutoSize;
            gridInscricoes.Location = new Point(70, 12);
            gridInscricoes.Name = "gridInscricoes";
            gridInscricoes.ReadOnly = true;
            gridInscricoes.RowHeadersWidth = 51;
            gridInscricoes.Size = new Size(626, 391);
            gridInscricoes.TabIndex = 0;
            // 
            // btnCancelar
            // 
            btnCancelar.Location = new Point(339, 409);
            btnCancelar.Name = "btnCancelar";
            btnCancelar.Size = new Size(94, 29);
            btnCancelar.TabIndex = 1;
            btnCancelar.Text = "Cancelar";
            btnCancelar.UseVisualStyleBackColor = true;
            btnCancelar.Click += btnCancelar_Click;
            // 
            // FrmMinhasInscricoes
            // 
            AutoScaleDimensions = new SizeF(8F, 20F);
            AutoScaleMode = AutoScaleMode.Font;
            ClientSize = new Size(800, 450);
            Controls.Add(btnCancelar);
            Controls.Add(gridInscricoes);
            Name = "FrmMinhasInscricoes";
            Text = "Minhas Inscrições";
            Load += FrmMinhasInscricoes_Load;
            ((System.ComponentModel.ISupportInitialize)gridInscricoes).EndInit();
            ResumeLayout(false);
        }

        #endregion

        private DataGridView gridInscricoes;
        private Button btnCancelar;
    }
}