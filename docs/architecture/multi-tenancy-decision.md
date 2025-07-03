# Multi-Tenancy Architecture Decision: Keycloak Groups vs Organizations

## Context

The DGRV Sustainability Assessment Tool requires a multi-tenant architecture to support multiple cooperative organizations with isolated data and user management. This document outlines the decision between implementing multi-tenancy using Keycloak's standard groups functionality versus the Phase Two Organizations extension.

## Decision Options

### Option 1: Groups-Based Multi-Tenancy (Selected)

**Architecture Pattern**: Single realm with group-based organization management

**Implementation Approach**:
- Organizations represented as Keycloak groups under `/organizations/` hierarchy
- Organization metadata stored as group attributes
- User-organization association through group membership
- Organization context propagated via JWT token claims

**Strengths**:
- ✅ **Native Keycloak Features**: No external dependencies or extensions
- ✅ **Simple Deployment**: Standard Keycloak configuration
- ✅ **Low Complexity**: Minimal moving parts
- ✅ **Cost Effective**: Single realm resource usage
- ✅ **Quick Development**: Leverages existing Keycloak APIs
- ✅ **Proven Stability**: Well-established group management patterns

**Limitations**:
- ⚠️ **Limited Tenant Isolation**: Shared realm-level policies
- ⚠️ **Basic Customization**: Cannot have organization-specific auth flows
- ⚠️ **Shared Identity Providers**: All organizations use same SSO configuration

### Option 2: Phase Two Organizations Extension

**Architecture Pattern**: Single realm with native organization entities

**Implementation Approach**:
- Organizations as first-class Keycloak entities
- Rich organization metadata and domain mapping
- Organization-specific identity providers and policies
- Enhanced multi-tenant capabilities

**Strengths**:
- ✅ **Strong Tenant Isolation**: Organization-specific policies and settings
- ✅ **Domain-Based Routing**: Automatic organization detection via email domains
- ✅ **Per-Organization SSO**: Custom identity providers per organization
- ✅ **Rich Metadata**: Comprehensive organization attribute support
- ✅ **Scalable Architecture**: Designed for SaaS multi-tenancy
- ✅ **Future-Proof**: Aligns with Keycloak's native organization roadmap

**Limitations**:
- ❌ **Extension Dependency**: Requires Phase Two extension maintenance
- ❌ **Higher Complexity**: More configuration and management overhead
- ❌ **Development Time**: Additional integration and testing required
- ❌ **Resource Overhead**: More complex deployment and monitoring

## Decision Rationale

### Primary Factors Supporting Groups-Based Approach

1. **Sufficient Feature Set**: The groups-based implementation meets all identified requirements for cooperative sustainability assessments

2. **Cooperative Organization Alignment**: Cooperatives share common methodologies and assessment frameworks, reducing the need for strict tenant isolation

3. **Reduced Complexity**: Maintaining fewer dependencies allows focus on core sustainability assessment features rather than infrastructure complexity

4. **Cost Optimization**: Single realm approach minimizes infrastructure costs, important for cooperative organizations with budget constraints

5. **Proven Reliability**: Standard Keycloak group management is well-tested and stable

6. **Development Velocity**: Allows rapid feature development without extension integration overhead

### Implementation Details

**JWT Token Structure**:
```json
{
  "sub": "user-uuid",
  "organization_id": "org-uuid",
  "organization_name": "Organization Name",
  "realm_access": {
    "roles": ["organization_admin", "user"]
  }
}
```

**Authentication Flow**:
1. User authenticates against single realm
2. Group membership determines organization association
3. Protocol mappers inject organization context into JWT
4. Application extracts organization context for data filtering

### Future Migration Triggers

Consider migrating to Phase Two Organizations when:
- Organization count exceeds 50 active tenants
- Regulatory requirements demand stricter tenant isolation
- Organizations require custom SSO integration
- White-label/branding requirements emerge
- Complex role hierarchies become necessary

## Conclusion

The groups-based multi-tenancy approach is the optimal choice for the DGRV Sustainability Assessment Tool based on current requirements, resource constraints, and the collaborative nature of cooperative organizations. This decision balances functionality, maintainability, and development velocity while providing a clear evolution path for future enhanced requirements.

The architecture decision supports the tool's mission of enabling effective sustainability assessments across cooperative organizations while maintaining operational efficiency and cost-effectiveness.

## References

1. Phase Two Multi-Tenancy Options: https://phasetwo.io/blog/multi-tenancy-options-keycloak/
2. Phase Two Organization Extension: https://phasetwo.io/blog/organgizations-multi-tenant-update/
3. Keycloak Documentation: https://www.keycloak.org/documentation

---

**Document Version**: 1.0  
**Date**: July 2025  
**Review Schedule**: Quarterly  
**Next Review**: October 2025
