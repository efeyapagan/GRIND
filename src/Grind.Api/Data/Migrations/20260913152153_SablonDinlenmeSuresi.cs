using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Grind.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class SablonDinlenmeSuresi : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "RestSeconds",
                table: "TemplateExercises",
                type: "integer",
                nullable: false,
                defaultValue: 90);

            migrationBuilder.AddCheckConstraint(
                name: "CK_TemplateExercise_RestSeconds_Range",
                table: "TemplateExercises",
                sql: "\"RestSeconds\" >= 0 AND \"RestSeconds\" <= 900");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_TemplateExercise_RestSeconds_Range",
                table: "TemplateExercises");

            migrationBuilder.DropColumn(
                name: "RestSeconds",
                table: "TemplateExercises");
        }
    }
}
