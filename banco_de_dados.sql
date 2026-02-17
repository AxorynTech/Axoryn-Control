-- ARQUIVO: banco_de_dados.sql
-- Resumo das correções de segurança e lógica de Equipes (Axoryn Control)

-- 1. CORREÇÃO DA RECURSÃO INFINITA (Permitir leitura de perfis)
DROP POLICY IF EXISTS "Ver perfis da mesma equipe" ON profiles;
CREATE POLICY "Leitura publica para autenticados" ON profiles 
FOR SELECT USING ( auth.role() = 'authenticated' );

-- 2. PERMITIR QUE O DONO EXCLUA A EQUIPE
DROP POLICY IF EXISTS "Dono pode excluir equipe" ON teams;
CREATE POLICY "Dono pode excluir equipe" ON teams 
FOR DELETE USING ( auth.uid() = owner_id );

-- 3. GATILHO PARA VINCULAR DONO AUTOMATICAMENTE AO CRIAR EQUIPE
CREATE OR REPLACE FUNCTION auto_vincular_dono_equipe()
RETURNS TRIGGER SECURITY DEFINER AS $$
BEGIN
  UPDATE profiles
  SET team_id = NEW.id, email = (SELECT email FROM auth.users WHERE id = NEW.owner_id)
  WHERE user_id = NEW.owner_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_vincular_dono ON teams;
CREATE TRIGGER trigger_auto_vincular_dono
AFTER INSERT ON teams
FOR EACH ROW EXECUTE FUNCTION auto_vincular_dono_equipe();

-- 4. AJUSTE DE CHAVE ESTRANGEIRA (Para soltar membros ao excluir equipe)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_team_id_fkey;
ALTER TABLE profiles ADD CONSTRAINT profiles_team_id_fkey
FOREIGN KEY (team_id) REFERENCES teams (id) ON DELETE SET NULL;