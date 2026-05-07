export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      budget_category: {
        Row: {
          created_at: string
          group_name: string | null
          id: string
          is_default: boolean
          name: string
          organization_id: string | null
          parent_id: string | null
          sort_order: number | null
        }
        Insert: {
          created_at?: string
          group_name?: string | null
          id?: string
          is_default?: boolean
          name: string
          organization_id?: string | null
          parent_id?: string | null
          sort_order?: number | null
        }
        Update: {
          created_at?: string
          group_name?: string | null
          id?: string
          is_default?: boolean
          name?: string
          organization_id?: string | null
          parent_id?: string | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_category_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_category_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "budget_category"
            referencedColumns: ["id"]
          },
        ]
      }
      comp: {
        Row: {
          address: string
          adjustment_cents: number
          adjustment_notes: string | null
          bathrooms: number | null
          bedrooms: number | null
          condition: string | null
          created_at: string
          days_on_market: number | null
          deal_analysis_id: string
          distance_miles: number | null
          external_id: string | null
          id: string
          included_in_arv: boolean
          last_synced_at: string | null
          lot_size_sqft: number | null
          notes: string | null
          organization_id: string
          sale_date: string | null
          sale_price_cents: number
          source_provider: string | null
          source_url: string | null
          sqft: number | null
          year_built: number | null
        }
        Insert: {
          address: string
          adjustment_cents?: number
          adjustment_notes?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          condition?: string | null
          created_at?: string
          days_on_market?: number | null
          deal_analysis_id: string
          distance_miles?: number | null
          external_id?: string | null
          id?: string
          included_in_arv?: boolean
          last_synced_at?: string | null
          lot_size_sqft?: number | null
          notes?: string | null
          organization_id: string
          sale_date?: string | null
          sale_price_cents: number
          source_provider?: string | null
          source_url?: string | null
          sqft?: number | null
          year_built?: number | null
        }
        Update: {
          address?: string
          adjustment_cents?: number
          adjustment_notes?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          condition?: string | null
          created_at?: string
          days_on_market?: number | null
          deal_analysis_id?: string
          distance_miles?: number | null
          external_id?: string | null
          id?: string
          included_in_arv?: boolean
          last_synced_at?: string | null
          lot_size_sqft?: number | null
          notes?: string | null
          organization_id?: string
          sale_date?: string | null
          sale_price_cents?: number
          source_provider?: string | null
          source_url?: string | null
          sqft?: number | null
          year_built?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "comp_deal_analysis_id_fkey"
            columns: ["deal_analysis_id"]
            isOneToOne: false
            referencedRelation: "deal_analysis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comp_deal_analysis_id_fkey"
            columns: ["deal_analysis_id"]
            isOneToOne: false
            referencedRelation: "deal_analysis_computed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comp_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization"
            referencedColumns: ["id"]
          },
        ]
      }
      contractor: {
        Row: {
          company: string | null
          created_at: string
          do_not_contact: boolean
          email: string | null
          id: string
          insurance_expiry: string | null
          is_active: boolean
          license_number: string | null
          name: string
          notes: string | null
          organization_id: string
          phone: string | null
          preferred_contact: string
          rating: number | null
          trade: string | null
          updated_at: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          do_not_contact?: boolean
          email?: string | null
          id?: string
          insurance_expiry?: string | null
          is_active?: boolean
          license_number?: string | null
          name: string
          notes?: string | null
          organization_id: string
          phone?: string | null
          preferred_contact?: string
          rating?: number | null
          trade?: string | null
          updated_at?: string
        }
        Update: {
          company?: string | null
          created_at?: string
          do_not_contact?: boolean
          email?: string | null
          id?: string
          insurance_expiry?: string | null
          is_active?: boolean
          license_number?: string | null
          name?: string
          notes?: string | null
          organization_id?: string
          phone?: string | null
          preferred_contact?: string
          rating?: number | null
          trade?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contractor_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_analysis: {
        Row: {
          analysis_type: string
          archived_at: string | null
          archived_by: string | null
          arv_cents: number
          arv_percentage: number
          buy_agent_commission_pct: number | null
          buying_closing_costs_cents: number | null
          cash_invested_cents: number | null
          created_at: string
          created_by: string | null
          financing_type: string | null
          holding_hoa_cents: number | null
          holding_insurance_cents: number | null
          holding_interest_cents: number | null
          holding_other_cents: number
          holding_period_months: number | null
          holding_taxes_cents: number | null
          holding_utilities_cents: number | null
          id: string
          interest_rate: number | null
          is_active: boolean
          is_archived: boolean
          loan_amount_cents: number | null
          loan_basis: string | null
          loan_term_months: number | null
          loan_to_value_pct: number | null
          monthly_holding_cost_cents: number | null
          monthly_maintenance_cents: number | null
          monthly_rent_cents: number | null
          name: string
          notes: string | null
          organization_id: string
          origination_points: number | null
          other_loan_fees_cents: number | null
          property_id: string
          property_mgmt_fee_pct: number | null
          purchase_price_cents: number
          refinance_interest_rate: number | null
          refinance_ltv_pct: number | null
          refinance_term_years: number | null
          rehab_estimate_cents: number
          sell_agent_commission_pct: number | null
          selling_closing_costs_cents: number | null
          staging_costs_cents: number
          updated_at: string
          vacancy_rate_pct: number | null
        }
        Insert: {
          analysis_type?: string
          archived_at?: string | null
          archived_by?: string | null
          arv_cents: number
          arv_percentage?: number
          buy_agent_commission_pct?: number | null
          buying_closing_costs_cents?: number | null
          cash_invested_cents?: number | null
          created_at?: string
          created_by?: string | null
          financing_type?: string | null
          holding_hoa_cents?: number | null
          holding_insurance_cents?: number | null
          holding_interest_cents?: number | null
          holding_other_cents?: number
          holding_period_months?: number | null
          holding_taxes_cents?: number | null
          holding_utilities_cents?: number | null
          id?: string
          interest_rate?: number | null
          is_active?: boolean
          is_archived?: boolean
          loan_amount_cents?: number | null
          loan_basis?: string | null
          loan_term_months?: number | null
          loan_to_value_pct?: number | null
          monthly_holding_cost_cents?: number | null
          monthly_maintenance_cents?: number | null
          monthly_rent_cents?: number | null
          name?: string
          notes?: string | null
          organization_id: string
          origination_points?: number | null
          other_loan_fees_cents?: number | null
          property_id: string
          property_mgmt_fee_pct?: number | null
          purchase_price_cents: number
          refinance_interest_rate?: number | null
          refinance_ltv_pct?: number | null
          refinance_term_years?: number | null
          rehab_estimate_cents: number
          sell_agent_commission_pct?: number | null
          selling_closing_costs_cents?: number | null
          staging_costs_cents?: number
          updated_at?: string
          vacancy_rate_pct?: number | null
        }
        Update: {
          analysis_type?: string
          archived_at?: string | null
          archived_by?: string | null
          arv_cents?: number
          arv_percentage?: number
          buy_agent_commission_pct?: number | null
          buying_closing_costs_cents?: number | null
          cash_invested_cents?: number | null
          created_at?: string
          created_by?: string | null
          financing_type?: string | null
          holding_hoa_cents?: number | null
          holding_insurance_cents?: number | null
          holding_interest_cents?: number | null
          holding_other_cents?: number
          holding_period_months?: number | null
          holding_taxes_cents?: number | null
          holding_utilities_cents?: number | null
          id?: string
          interest_rate?: number | null
          is_active?: boolean
          is_archived?: boolean
          loan_amount_cents?: number | null
          loan_basis?: string | null
          loan_term_months?: number | null
          loan_to_value_pct?: number | null
          monthly_holding_cost_cents?: number | null
          monthly_maintenance_cents?: number | null
          monthly_rent_cents?: number | null
          name?: string
          notes?: string | null
          organization_id?: string
          origination_points?: number | null
          other_loan_fees_cents?: number | null
          property_id?: string
          property_mgmt_fee_pct?: number | null
          purchase_price_cents?: number
          refinance_interest_rate?: number | null
          refinance_ltv_pct?: number | null
          refinance_term_years?: number | null
          rehab_estimate_cents?: number
          sell_agent_commission_pct?: number | null
          selling_closing_costs_cents?: number | null
          staging_costs_cents?: number
          updated_at?: string
          vacancy_rate_pct?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_analysis_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_analysis_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "property"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_analysis_revision: {
        Row: {
          deal_analysis_id: string
          edited_at: string
          edited_by: string | null
          id: string
          organization_id: string
          snapshot: Json
        }
        Insert: {
          deal_analysis_id: string
          edited_at?: string
          edited_by?: string | null
          id?: string
          organization_id: string
          snapshot: Json
        }
        Update: {
          deal_analysis_id?: string
          edited_at?: string
          edited_by?: string | null
          id?: string
          organization_id?: string
          snapshot?: Json
        }
        Relationships: [
          {
            foreignKeyName: "deal_analysis_revision_deal_analysis_id_fkey"
            columns: ["deal_analysis_id"]
            isOneToOne: false
            referencedRelation: "deal_analysis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_analysis_revision_deal_analysis_id_fkey"
            columns: ["deal_analysis_id"]
            isOneToOne: false
            referencedRelation: "deal_analysis_computed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_analysis_revision_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization"
            referencedColumns: ["id"]
          },
        ]
      }
      document: {
        Row: {
          created_at: string
          document_type: string
          entity_id: string
          entity_type: string
          external_envelope_id: string | null
          external_provider: string | null
          file_name: string
          file_size_bytes: number | null
          file_type: string | null
          file_url: string | null
          id: string
          notes: string | null
          organization_id: string
          signature_status: string
          signed_at: string | null
          signers: Json | null
          signing_url: string | null
          storage_path: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          document_type: string
          entity_id: string
          entity_type: string
          external_envelope_id?: string | null
          external_provider?: string | null
          file_name: string
          file_size_bytes?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          signature_status?: string
          signed_at?: string | null
          signers?: Json | null
          signing_url?: string | null
          storage_path: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          document_type?: string
          entity_id?: string
          entity_type?: string
          external_envelope_id?: string | null
          external_provider?: string | null
          file_name?: string
          file_size_bytes?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          signature_status?: string
          signed_at?: string | null
          signers?: Json | null
          signing_url?: string | null
          storage_path?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization"
            referencedColumns: ["id"]
          },
        ]
      }
      organization: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      organization_member: {
        Row: {
          id: string
          invited_at: string
          joined_at: string | null
          organization_id: string
          role: string
          user_id: string
        }
        Insert: {
          id?: string
          invited_at?: string
          joined_at?: string | null
          organization_id: string
          role?: string
          user_id: string
        }
        Update: {
          id?: string
          invited_at?: string
          joined_at?: string | null
          organization_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_member_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_settings: {
        Row: {
          default_arv_pct: number
          default_contingency_pct: number
          default_holding_months: number
          default_sell_commission_pct: number
          organization_id: string
          over_budget_alert_pct: number
          qb_auto_sync_cron: string | null
          qb_sync_enabled: boolean
          updated_at: string
        }
        Insert: {
          default_arv_pct?: number
          default_contingency_pct?: number
          default_holding_months?: number
          default_sell_commission_pct?: number
          organization_id: string
          over_budget_alert_pct?: number
          qb_auto_sync_cron?: string | null
          qb_sync_enabled?: boolean
          updated_at?: string
        }
        Update: {
          default_arv_pct?: number
          default_contingency_pct?: number
          default_holding_months?: number
          default_sell_commission_pct?: number
          organization_id?: string
          over_budget_alert_pct?: number
          qb_auto_sync_cron?: string | null
          qb_sync_enabled?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organization"
            referencedColumns: ["id"]
          },
        ]
      }
      project: {
        Row: {
          actual_agent_commission_cents: number | null
          actual_buyer_closing_cents: number | null
          actual_purchase_price_cents: number | null
          actual_sale_price_cents: number | null
          actual_seller_closing_cents: number | null
          contingency_pct: number
          contract_date: string | null
          created_at: string
          created_by: string | null
          deal_analysis_id: string | null
          id: string
          listing_date: string | null
          loan_payoff_cents: number | null
          name: string
          notes: string | null
          offer_date: string | null
          organization_id: string
          pipeline_stage: string
          property_id: string
          purchase_date: string | null
          qb_class_name: string | null
          qb_customer_id: string | null
          rehab_actual_end: string | null
          rehab_end_date: string | null
          rehab_start_date: string | null
          sale_date: string | null
          stage_changed_at: string
          status: string
          updated_at: string
        }
        Insert: {
          actual_agent_commission_cents?: number | null
          actual_buyer_closing_cents?: number | null
          actual_purchase_price_cents?: number | null
          actual_sale_price_cents?: number | null
          actual_seller_closing_cents?: number | null
          contingency_pct?: number
          contract_date?: string | null
          created_at?: string
          created_by?: string | null
          deal_analysis_id?: string | null
          id?: string
          listing_date?: string | null
          loan_payoff_cents?: number | null
          name: string
          notes?: string | null
          offer_date?: string | null
          organization_id: string
          pipeline_stage?: string
          property_id: string
          purchase_date?: string | null
          qb_class_name?: string | null
          qb_customer_id?: string | null
          rehab_actual_end?: string | null
          rehab_end_date?: string | null
          rehab_start_date?: string | null
          sale_date?: string | null
          stage_changed_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          actual_agent_commission_cents?: number | null
          actual_buyer_closing_cents?: number | null
          actual_purchase_price_cents?: number | null
          actual_sale_price_cents?: number | null
          actual_seller_closing_cents?: number | null
          contingency_pct?: number
          contract_date?: string | null
          created_at?: string
          created_by?: string | null
          deal_analysis_id?: string | null
          id?: string
          listing_date?: string | null
          loan_payoff_cents?: number | null
          name?: string
          notes?: string | null
          offer_date?: string | null
          organization_id?: string
          pipeline_stage?: string
          property_id?: string
          purchase_date?: string | null
          qb_class_name?: string | null
          qb_customer_id?: string | null
          rehab_actual_end?: string | null
          rehab_end_date?: string | null
          rehab_start_date?: string | null
          sale_date?: string | null
          stage_changed_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_deal_analysis_id_fkey"
            columns: ["deal_analysis_id"]
            isOneToOne: false
            referencedRelation: "deal_analysis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_deal_analysis_id_fkey"
            columns: ["deal_analysis_id"]
            isOneToOne: false
            referencedRelation: "deal_analysis_computed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "property"
            referencedColumns: ["id"]
          },
        ]
      }
      project_budget: {
        Row: {
          budget_category_id: string
          created_at: string
          estimated_cents: number
          id: string
          notes: string | null
          project_id: string
          updated_at: string
        }
        Insert: {
          budget_category_id: string
          created_at?: string
          estimated_cents?: number
          id?: string
          notes?: string | null
          project_id: string
          updated_at?: string
        }
        Update: {
          budget_category_id?: string
          created_at?: string
          estimated_cents?: number
          id?: string
          notes?: string | null
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_budget_budget_category_id_fkey"
            columns: ["budget_category_id"]
            isOneToOne: false
            referencedRelation: "budget_category"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_budget_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_budget_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_financials"
            referencedColumns: ["id"]
          },
        ]
      }
      project_expense: {
        Row: {
          amount_cents: number
          budget_category_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          expense_date: string
          id: string
          payment_method: string | null
          project_id: string
          receipt_url: string | null
          updated_at: string
          vendor_name: string | null
        }
        Insert: {
          amount_cents: number
          budget_category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          expense_date: string
          id?: string
          payment_method?: string | null
          project_id: string
          receipt_url?: string | null
          updated_at?: string
          vendor_name?: string | null
        }
        Update: {
          amount_cents?: number
          budget_category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          payment_method?: string | null
          project_id?: string
          receipt_url?: string | null
          updated_at?: string
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_expense_budget_category_id_fkey"
            columns: ["budget_category_id"]
            isOneToOne: false
            referencedRelation: "budget_category"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_expense_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_expense_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_financials"
            referencedColumns: ["id"]
          },
        ]
      }
      property: {
        Row: {
          active_deal_analysis_id: string | null
          address_line1: string
          address_line2: string | null
          bathrooms: number | null
          bedrooms: number | null
          city: string
          county: string | null
          created_at: string
          created_by: string | null
          dedupe_key: string | null
          external_id: string | null
          id: string
          last_synced_at: string | null
          latitude: number | null
          longitude: number | null
          lot_size_sqft: number | null
          mls_number: string | null
          notes: string | null
          organization_id: string
          property_type: string | null
          source: string | null
          source_provider: string | null
          sqft: number | null
          state: string
          thumbnail_url: string | null
          updated_at: string
          year_built: number | null
          zip: string
        }
        Insert: {
          active_deal_analysis_id?: string | null
          address_line1: string
          address_line2?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          city: string
          county?: string | null
          created_at?: string
          created_by?: string | null
          dedupe_key?: string | null
          external_id?: string | null
          id?: string
          last_synced_at?: string | null
          latitude?: number | null
          longitude?: number | null
          lot_size_sqft?: number | null
          mls_number?: string | null
          notes?: string | null
          organization_id: string
          property_type?: string | null
          source?: string | null
          source_provider?: string | null
          sqft?: number | null
          state: string
          thumbnail_url?: string | null
          updated_at?: string
          year_built?: number | null
          zip: string
        }
        Update: {
          active_deal_analysis_id?: string | null
          address_line1?: string
          address_line2?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          city?: string
          county?: string | null
          created_at?: string
          created_by?: string | null
          dedupe_key?: string | null
          external_id?: string | null
          id?: string
          last_synced_at?: string | null
          latitude?: number | null
          longitude?: number | null
          lot_size_sqft?: number | null
          mls_number?: string | null
          notes?: string | null
          organization_id?: string
          property_type?: string | null
          source?: string | null
          source_provider?: string | null
          sqft?: number | null
          state?: string
          thumbnail_url?: string | null
          updated_at?: string
          year_built?: number | null
          zip?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_active_deal_analysis_id_fkey"
            columns: ["active_deal_analysis_id"]
            isOneToOne: false
            referencedRelation: "deal_analysis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_active_deal_analysis_id_fkey"
            columns: ["active_deal_analysis_id"]
            isOneToOne: false
            referencedRelation: "deal_analysis_computed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          default_landing: string
          theme: string
          updated_at: string
          user_id: string
        }
        Insert: {
          default_landing?: string
          theme?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          default_landing?: string
          theme?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      deal_analysis_computed: {
        Row: {
          analysis_type: string | null
          annualized_roi_pct: number | null
          archived_at: string | null
          archived_by: string | null
          arv_cents: number | null
          arv_percentage: number | null
          buy_agent_commission_pct: number | null
          buy_commission_cents: number | null
          buying_closing_costs_cents: number | null
          cash_invested_cents: number | null
          comp_count: number | null
          created_at: string | null
          created_by: string | null
          effective_cash_invested_cents: number | null
          effective_loan_cents: number | null
          effective_monthly_rent_cents: number | null
          financing_type: string | null
          holding_hoa_cents: number | null
          holding_insurance_cents: number | null
          holding_interest_cents: number | null
          holding_other_cents: number | null
          holding_period_months: number | null
          holding_taxes_cents: number | null
          holding_utilities_cents: number | null
          id: string | null
          interest_rate: number | null
          is_active: boolean | null
          is_archived: boolean | null
          loan_amount_cents: number | null
          loan_basis: string | null
          loan_term_months: number | null
          loan_to_value_pct: number | null
          monthly_holding_cost_cents: number | null
          monthly_maintenance_cents: number | null
          monthly_rent_cents: number | null
          mpp_cents: number | null
          name: string | null
          net_profit_cents: number | null
          notes: string | null
          organization_id: string | null
          origination_fee_cents: number | null
          origination_points: number | null
          other_loan_fees_cents: number | null
          profit_margin_pct: number | null
          property_id: string | null
          property_mgmt_fee_pct: number | null
          purchase_price_cents: number | null
          refi_loan_amount_cents: number | null
          refinance_interest_rate: number | null
          refinance_ltv_pct: number | null
          refinance_term_years: number | null
          rehab_estimate_cents: number | null
          roi_pct: number | null
          sell_agent_commission_pct: number | null
          sell_commission_cents: number | null
          selling_closing_costs_cents: number | null
          staging_costs_cents: number | null
          suggested_arv_cents: number | null
          total_acquisition_cents: number | null
          total_holding_cents: number | null
          total_interest_cents: number | null
          total_project_cost_cents: number | null
          total_selling_cents: number | null
          updated_at: string | null
          vacancy_rate_pct: number | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_analysis_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_analysis_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "property"
            referencedColumns: ["id"]
          },
        ]
      }
      project_financials: {
        Row: {
          actual_purchase_price_cents: number | null
          arv_cents: number | null
          budget_variance_cents: number | null
          id: string | null
          name: string | null
          organization_id: string | null
          percent_spent: number | null
          pipeline_stage: string | null
          projected_net_profit_cents: number | null
          projected_roi_pct: number | null
          total_budget_cents: number | null
          total_spent_cents: number | null
        }
        Relationships: [
          {
            foreignKeyName: "project_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      user_organization_ids: { Args: never; Returns: string[] }
      user_role_in_org: { Args: { org: string }; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
