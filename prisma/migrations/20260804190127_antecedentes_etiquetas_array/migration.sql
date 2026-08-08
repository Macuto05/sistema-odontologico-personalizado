-- Historia clínica: 4 campos de texto libre pasan a listas de etiquetas independientes
-- (008-rediseno-visual-sistema). Un valor existente no nulo se conserva como una etiqueta
-- de un solo elemento en vez de perderse.

ALTER TABLE "Paciente"
  ALTER COLUMN "antecedentesPatologicosOtros" TYPE TEXT[]
    USING CASE WHEN "antecedentesPatologicosOtros" IS NULL THEN '{}'::TEXT[]
                ELSE ARRAY["antecedentesPatologicosOtros"] END,
  ALTER COLUMN "antecedentesPatologicosOtros" SET DEFAULT '{}',
  ALTER COLUMN "antecedentesPatologicosOtros" SET NOT NULL;

ALTER TABLE "Paciente"
  ALTER COLUMN "antecedentesHeredofamiliares" TYPE TEXT[]
    USING CASE WHEN "antecedentesHeredofamiliares" IS NULL THEN '{}'::TEXT[]
                ELSE ARRAY["antecedentesHeredofamiliares"] END,
  ALTER COLUMN "antecedentesHeredofamiliares" SET DEFAULT '{}',
  ALTER COLUMN "antecedentesHeredofamiliares" SET NOT NULL;

ALTER TABLE "Paciente"
  ALTER COLUMN "medicamentosActuales" TYPE TEXT[]
    USING CASE WHEN "medicamentosActuales" IS NULL THEN '{}'::TEXT[]
                ELSE ARRAY["medicamentosActuales"] END,
  ALTER COLUMN "medicamentosActuales" SET DEFAULT '{}',
  ALTER COLUMN "medicamentosActuales" SET NOT NULL;

ALTER TABLE "Paciente"
  ALTER COLUMN "alergias" TYPE TEXT[]
    USING CASE WHEN "alergias" IS NULL THEN '{}'::TEXT[]
                ELSE ARRAY["alergias"] END,
  ALTER COLUMN "alergias" SET DEFAULT '{}',
  ALTER COLUMN "alergias" SET NOT NULL;
