-- Migration 0024: Support Multi-Vertical Building Ecosystem & Complexity Modes
-- Enables organizations to configure their specific industry vertical and operating depth.

DO $$
BEGIN
    -- Add industry vertical column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'orgs' 
        AND column_name = 'industry'
    ) THEN
        ALTER TABLE public.orgs 
        ADD COLUMN industry TEXT NOT NULL DEFAULT 'real_estate'
        CHECK (industry IN (
            'real_estate',
            'building_materials',
            'interior_furniture',
            'architecture_design',
            'contractor_builder'
        ));
    END IF;

    -- Add complexity mode column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'orgs' 
        AND column_name = 'complexity_mode'
    ) THEN
        ALTER TABLE public.orgs 
        ADD COLUMN complexity_mode TEXT NOT NULL DEFAULT 'deep'
        CHECK (complexity_mode IN ('simple', 'deep'));
    END IF;

    -- Add vertical settings JSONB for custom attributes (price lists, drawing stages, MOQ)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'orgs' 
        AND column_name = 'vertical_settings'
    ) THEN
        ALTER TABLE public.orgs 
        ADD COLUMN vertical_settings JSONB NOT NULL DEFAULT '{}'::jsonb;
    END IF;
END $$;

COMMENT ON COLUMN public.orgs.industry IS 'Operating industry vertical: real_estate, building_materials, interior_furniture, architecture_design, contractor_builder';
COMMENT ON COLUMN public.orgs.complexity_mode IS 'Operational UI depth: simple (high-velocity/lite) or deep (multi-tier enterprise)';
COMMENT ON COLUMN public.orgs.vertical_settings IS 'Vertical-specific configuration, wholesale tiers, and custom stage presets';
