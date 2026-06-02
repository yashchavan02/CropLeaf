import re
from django.contrib.auth.models import User
from django.core.validators import EmailValidator
from django import forms


def validate_username(username):
    if not (5 <= len(username) <= 15):
        raise forms.ValidationError("Username must be 5 to 15 chars.")
    if not username[0].islower():
        raise forms.ValidationError("Must start with a lowercase letter.")
    if not any(char.isdigit() for char in username):
        raise forms.ValidationError("Must contain one numeric digit.")
    if re.search(r'[^a-z0-9]', username):
        raise forms.ValidationError("Only lowercase letters & digits allowed.")

def validate_password(password):
    if len(password) < 6:
        raise forms.ValidationError("Password must be at least 6 chars.")
    if not any(char.islower() for char in password):
        raise forms.ValidationError("Must contain a lowercase letter.")
    if not any(char.isdigit() for char in password):
        raise forms.ValidationError("Must contain a digit.")
    if ' ' in password:
        raise forms.ValidationError("No spaces allowed.")
    
def validate_name(name):
    if not re.match(r'^[A-Za-z0-9 ]+$', name):
        raise forms.ValidationError("No special characters.")

class RegistrationForm(forms.ModelForm):
    password = forms.CharField(widget=forms.PasswordInput, validators=[validate_password])
    confirm_password = forms.CharField(widget=forms.PasswordInput)
    name = forms.CharField(required=True)
    email = forms.EmailField(required=True)
    # password = forms.CharField(
    #     widget=forms.PasswordInput(attrs={'placeholder': 'abcd@1234'}),
    #     validators=[validate_password]
    # )

    # confirm_password = forms.CharField(
    #     widget=forms.PasswordInput(attrs={'placeholder': 'abcd@1234'})
    # )

    # name = forms.CharField(
    #     required=True,
    #     widget=forms.TextInput(attrs={'placeholder': 'Yash Chavan'})
    # )

    # email = forms.EmailField(
    #     required=True,
    #     widget=forms.EmailInput(attrs={'placeholder': 'detectdisease@cropleaf.com'})
    # )

    # username = forms.CharField(
    #     widget=forms.TextInput(attrs={'placeholder': 'cropleaf01'})
    # )

    class Meta:
        model = User
        fields = ['username', 'name', 'email']

    def clean_username(self):
        username = self.cleaned_data.get("username")
        validate_username(username)
        if User.objects.filter(username=username).exists():
            raise forms.ValidationError("This username is already taken.")
        return username

    def clean_email(self):
        email = self.cleaned_data.get('email')
        if email:
            validator = EmailValidator()
            try:
                validator(email)
            except forms.ValidationError:
                raise forms.ValidationError("Please enter a valid email address.")

            if User.objects.filter(email=email).exists():
                raise forms.ValidationError("This email is already registered.")
        return email
    
    def clean_name(self):
        name = self.cleaned_data.get("name")
        validate_name(name)
        return name

    def clean(self):
        cleaned_data = super().clean()
        password = cleaned_data.get("password")
        confirm_password = cleaned_data.get("confirm_password")

        if password != confirm_password:
            raise forms.ValidationError("Hey! Make sure your passwords are matching")
        return cleaned_data

    def save(self, commit=True):
        user = super().save(commit=False)
        user.set_password(self.cleaned_data["password"])
        if commit:
            user.save()
        return user


class ProfileEditForm(forms.ModelForm):
    email = forms.EmailField(required=True)
    first_name = forms.CharField(required=True, label='Name')

    class Meta:
        model = User
        fields = ['username','first_name','email']

    def clean_email(self):
        email = self.cleaned_data.get('email')
        if email:
            validator = EmailValidator()
            try:
                validator(email)
            except forms.ValidationError:
                raise forms.ValidationError("Please enter a valid email address.")
            
        return email
    
    def clean_username(self):
        username = self.cleaned_data.get("username")
        validate_username(username)
        return username

    def save(self, commit=True):
        user = super().save(commit=False)
        if commit:
            user.save()
        return user

