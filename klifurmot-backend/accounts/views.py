import logging
import re
import time
from django.db import IntegrityError
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAdminUser
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token
from django.views.decorators.csrf import csrf_exempt
from rest_framework.views import APIView
from django.http import Http404
from django.contrib.auth import authenticate, get_user_model
from django.core.exceptions import ValidationError
from django.utils.dateparse import parse_date
from django.utils import timezone
from google.oauth2 import id_token
from google.auth.transport import requests
from django.conf import settings
from django.db import transaction
from datetime import date

from . import permissions
from core import utils
from . import services
from . import serializers
from . import models


logger = logging.getLogger(__name__)

# Create your views here.

class CountryViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for countries - read-only list"""
    queryset = models.Country.objects.all()
    serializer_class = serializers.CountrySerializer
    permission_classes = [AllowAny]
    
    def list(self, request, *args, **kwargs):
        """List all countries"""
        try:
            result = services.get_countries()
            serializer = self.get_serializer(result['countries'], many=True)
            
            return utils.success_response(
                data=serializer.data,
                message='Countries retrieved successfully'
            )
        
        except Exception as e:
            logger.error(f'Error retrieving countries: {str(e)}')
            return utils.error_response(
                code='Server_error',
                message='Failed to retrieve countries',
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class CompetitionRoleViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for competition roles (judge, admin assignments)"""
    serializer_class = serializers.CompetitionRoleSerializer
    permission_classes = [IsAuthenticated]
    
    def list(self, request, *args, **kwargs):
        """List all roles based on permissions"""
        try:
            competition_id = request.query_params.get('competition_id')
            role = request.query_params.get('role')
            
            result = services.get_competition_roles(
                user=request.user,
                competition_id=competition_id,
                role=role
            )
            
            serializer = self.get_serializer(result['roles'], many=True)
            
            return utils.success_response(
                data=serializer.data,
                message='Roles retrieved successfully'
            )
        
        except PermissionError as e:
            return utils.error_response(
                code='Access_denied',
                message=str(e),
                status_code=status.HTTP_403_FORBIDDEN
            )
        
        except Exception as e:
            logger.error(f'Error retrieving roles: {str(e)}')
            return utils.error_response(
                code='Server_error',
                message='Failed to retrieve roles',
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def retrieve(self, request, *args, **kwargs):
        """Retrieve single role"""
        try:
            role_id = kwargs.get('pk')
            
            result = services.get_competition_role_by_id(
                user=request.user,
                role_id=role_id
            )
            
            serializer = self.get_serializer(result['role'])
            
            return utils.success_response(
                data=serializer.data,
                message='Role retrieved successfully'
            )
        
        except models.CompetitionRole.DoesNotExist:
            return utils.error_response(
                code='Not_found',
                message='Role not found',
                status_code=status.HTTP_404_NOT_FOUND
            )
        
        except PermissionError as e:
            return utils.error_response(
                code='Access_denied',
                message=str(e),
                status_code=status.HTTP_403_FORBIDDEN
            )
        
        except Exception as e:
            logger.error(f'Error retrieving role: {str(e)}')
            return utils.error_response(
                code='Server_error',
                message='Failed to retrieve role',
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated, permissions.IsActiveAccount])
def me(request):
    """Get or update current user profile"""
    
    if request.method == 'GET':
        try:
            result = services.get_profile(user=request.user)
            
            return utils.success_response(
                data={
                    'token': result['token'],
                    'user': {
                        'id': result['user'].id,
                        'username': result['user'].username,
                        'email': result['user'].email,
                    },
                    'profile': serializers.UserProfileResponseSerializer(result['user_account']).data
                },
                message='Profile retrieved successfully'
            )
        
        except ValueError as e:
            return utils.error_response(
                code='Profile_not_found',
                message=str(e),
                status_code=status.HTTP_404_NOT_FOUND
            )
        
        except Exception as e:
            logger.error(f'Unexpected error retrieving profile: {str(e)}')
            return utils.error_response(
                code='Server_error',
                message='Failed to retrieve profile',
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    elif request.method == 'PATCH':
        serializer = serializers.UpdateProfileSerializer(data=request.data)
        
        if not serializer.is_valid():
            return utils.validation_error_response(serializer.errors)
        
        profile_picture = None
        if 'profile_picture' in request.data:
            if 'profile_picture' in request.FILES:
                uploaded_file = request.FILES['profile_picture']
                try:
                    validate_profile_picture(uploaded_file)
                    profile_picture = uploaded_file
                except serializers.ValidationError as e:
                    return utils.error_response(
                        code='Invalid_file',
                        message=str(e),
                        status_code=status.HTTP_400_BAD_REQUEST
                    )
            elif request.data.get('profile_picture') == '':
                profile_picture = ''
        
        try:
            result = services.update_profile(
                user=request.user,
                profile_picture=profile_picture,
                **serializer.validated_data
            )
            
            return utils.success_response(
                data={
                    'token': result['token'],
                    'user': {
                        'id': result['user'].id,
                        'username': result['user'].username,
                        'email': result['user'].email,
                    },
                    'profile': serializers.UserProfileResponseSerializer(result['user_account']).data
                },
                message='Profile updated successfully'
            )
        
        except Country.DoesNotExist:
            return utils.error_response(
                code='Invalid_nationality',
                message='Invalid nationality code',
                status_code=status.HTTP_400_BAD_REQUEST
            )
        
        except Exception as e:
            logger.error(f'Unexpected error updating profile: {str(e)}')
            return utils.error_response(
                code='Server_error',
                message='Failed to update profile',
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    """Login a user account"""
    
    serializer = serializers.LoginSerializer(data=request.data)

    if not serializer.is_valid():
        return utils.validation_error_response(serializer.errors)

    try:
        result = services.login(**serializer.validated_data)

        return utils.success_response(
            data={
                'token': result['token'],
                'user': {
                    'id': result['user'].id,
                    'username': result['user'].username,
                    'email': result['user'].email,
                    'full_name': result['user_account'].full_name,
                }
            },
            message='Login successful',
            status_code=status.HTTP_200_OK
            
        )
    except ValueError as e:
        return utils.error_response(
            code='Invalid_credentials',
            message=str(e),
            status_code=status.HTTP_401_UNAUTHORIZED
        )
        
    except Exception as e:
        logger.error(f'Unexpected error during login: {str(e)}')
        return utils.error_response(
            code="Login_failed",
            message="Login failed due to server error",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def google_login(request):
    """Login or register user via Google OAuth"""
    
    serializer = serializers.GoogleLoginSerializer(data=request.data)
    
    if not serializer.is_valid():
        return utils.validation_error_response(serializer.errors)
    
    try:
        result = services.google_login(
            google_token=serializer.validated_data['token']
        )
        
        return utils.success_response(
            data={
                'token': result['token'],
                'user': {
                    'id': result['user'].id,
                    'username': result['user'].username,
                    'email': result['user'].email,
                    'full_name': result['user_account'].full_name,
                }
            },
            message='Google login successful',
            status_code=status.HTTP_200_OK
        )
    
    except ValueError as e:
        return utils.error_response(
            code='Invalid_token',
            message=str(e),
            status_code=status.HTTP_401_UNAUTHORIZED
        )
    
    except Exception as e:
        logger.error(f'Unexpected error during Google login: {str(e)}')
        return utils.error_response(
            code='Login_failed',
            message='Google login failed',
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    """Register a new user account"""
    serializer = serializers.RegisterSerializer(data=request.data)
    
    if not serializer.is_valid():
        return utils.validation_error_response(serializer.errors)

    try:
        result = services.register(**serializer.validated_data)
        
        return utils.success_response(
            data={
                'token': result['token'],
                'user': {
                    'id': result['user'].id,
                    'username': result['user'].username,
                    'email': result['user'].email,
                    'full_name': result['user_account'].full_name,
                }
            },
            message="User registered successfully",
            status_code=status.HTTP_201_CREATED
        )        
    except IntegrityError:
        logger.error('IntegrityError during registration')
        return utils.error_response(
            code="Duplicate_user",
            message="Username or email already exists",
            status_code=status.HTTP_409_CONFLICT
        )
    
    except Country.DoesNotExist:
        logger.error('Country not found during registration')
        return utils.error_response(
            code="Invalid_nationality",
            message="Invalid nationality code",
            status_code=status.HTTP_400_BAD_REQUEST
        )
    
    except Exception as e:
        logger.error(f'Unexpected error during registration: {str(e)}')
        return utils.error_response(
            code="Registration_failed",
            message="Registration failed due to server error",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@csrf_exempt
@api_view(['POST'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def logout(request):
    """Logout user by deleting their token"""
    print("====== LOGOUT CALLED ======")
    print(f"User: {request.user}")
    print(f"Is authenticated: {request.user.is_authenticated}")
    print(f"Auth header: {request.META.get('HTTP_AUTHORIZATION')}")

    try:
        services.logout(user=request.user)
        
        return utils.success_response(
            data=None,
            message='Successfully logged out',
            status_code=status.HTTP_200_OK
        )
    
    except Exception as e:
        logger.error(f'Unexpected error during logout: {str(e)}')
        return utils.error_response(
            code='Logout_failed',
            message='Logout failed',
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

