using System;

namespace Eventhub.Desktop
{
    public class Evento
    {
        // Tem de ser igualzinho ao JSON que o Java manda
        public long Id { get; set; }
        public string Nome { get; set; }
        public string Descricao { get; set; }
        public string Local { get; set; }
        // Se tiver data, adiciona aqui depois
    }
}