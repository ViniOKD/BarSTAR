from rest_framework.permissions import DjangoModelPermissions
from rest_framework.permissions import BasePermission


class PermissoesPromocao(DjangoModelPermissions):
    # copia as permissões padrão.
    perms_map = DjangoModelPermissions.perms_map.copy()

    # exige permissão de visualização nos métodos de consulta.
    perms_map.update({
        "GET": ["%(app_label)s.view_%(model_name)s"],
        "HEAD": ["%(app_label)s.view_%(model_name)s"],
        "OPTIONS": ["%(app_label)s.view_%(model_name)s"],
    })

class IsGarcomAuthenticated(BasePermission):
    message = "Acesso permitido somente para garçons autenticados."

    def has_permission(self, request, view):
        return (
            request.session.get("tipo_usuario") == "garcom"
            and request.session.get("garcom_id") is not None
        )
