/* =========================================================
   BANCO.JS
   Este é o ÚNICO lugar do projeto com o endereço do Supabase
   e a chave pública. Todas as páginas (site, login e admin)
   carregam este arquivo e usam o mesmo "banco" a partir dele.

   A chave abaixo é a chave PÚBLICA (publishable/anon). Ela não
   é secreta: quem protege os dados de verdade são as regras de
   RLS que estão no arquivo banco.sql. NUNCA coloque aqui a
   chave "service_role" (a chave secreta) do Supabase.
========================================================= */

const URL_SUPABASE = "https://znkvmwhpnnbfelwmiqzo.supabase.co";
const CHAVE_SUPABASE_PUBLICA = "sb_publishable_NwP4wKU63LHC6uKIxcxcCw_c9lu66ju";

// "supabase" aqui vem do script do CDN carregado antes deste arquivo.
// "banco" é o objeto que todas as outras páginas usam pra falar com o banco de dados.
window.banco = window.supabase.createClient(URL_SUPABASE, CHAVE_SUPABASE_PUBLICA);
